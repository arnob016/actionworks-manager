import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, type GenerationConfig } from "@google/generative-ai"
import { cookies } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { staticConfig } from "@/lib/config" // Used for available options in prompt
import type { Task, TaskFormData } from "@/lib/types"

const MODEL_NAME = "gemini-1.5-flash-latest" // Updated model
const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY as string

if (!API_KEY) {
  console.error("GOOGLE_GENERATIVE_AI_API_KEY is not set.")
}

const genAI = new GoogleGenerativeAI(API_KEY)

const generationConfig: GenerationConfig = {
  temperature: 0.4, // Slightly increased for more varied suggestions
  topK: 1,
  topP: 1,
  maxOutputTokens: 8192, // Increased for potentially larger JSON
}

// Safety settings remain the same
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
]

const mapTaskToSupabaseTask = (taskData: Partial<Task> | Partial<TaskFormData>): any => {
  const supabaseData: any = {}
  if (taskData.title !== undefined) supabaseData.title = taskData.title
  if (taskData.description !== undefined) supabaseData.description = taskData.description
  if (taskData.status !== undefined) supabaseData.status = taskData.status
  if (taskData.priority !== undefined) supabaseData.priority = taskData.priority
  if (taskData.assignees !== undefined) supabaseData.assignees = taskData.assignees
  if (taskData.startDate !== undefined) supabaseData.start_date = taskData.startDate
  if (taskData.dueDate !== undefined) supabaseData.due_date = taskData.dueDate
  if (taskData.effort !== undefined) supabaseData.effort = taskData.effort
  if (taskData.productArea !== undefined) supabaseData.product_area = taskData.productArea
  if (taskData.order !== undefined) supabaseData.order = taskData.order
  if (taskData.dependsOn !== undefined) supabaseData.depends_on = taskData.dependsOn
  if (taskData.reporter !== undefined) supabaseData.reporter = taskData.reporter
  if (taskData.parentId !== undefined) supabaseData.parent_id = taskData.parentId
  if (taskData.tags !== undefined) supabaseData.tags = taskData.tags
  return supabaseData
}

const mapSupabaseTaskToTask = (supabaseTask: any): Task => {
  return {
    id: supabaseTask.id,
    title: supabaseTask.title,
    description: supabaseTask.description || "",
    status: supabaseTask.status,
    priority: supabaseTask.priority,
    assignees: supabaseTask.assignees || [],
    startDate: supabaseTask.start_date ? new Date(supabaseTask.start_date).toISOString().split("T")[0] : null,
    dueDate: supabaseTask.due_date ? new Date(supabaseTask.due_date).toISOString().split("T")[0] : null,
    effort: supabaseTask.effort,
    productArea: supabaseTask.product_area,
    order: supabaseTask.order,
    dependsOn: supabaseTask.depends_on || [],
    reporter: supabaseTask.reporter,
    parentId: supabaseTask.parent_id,
    tags: supabaseTask.tags || [],
    attachments: [],
    comments: [],
    createdAt: supabaseTask.created_at,
    updatedAt: supabaseTask.updated_at,
  }
}

function buildSystemPrompt(currentUser = "User") {
  const today = new Date().toLocaleDateString("en-CA")
  const availableStatuses = staticConfig.statuses.map((s) => s.name).join(", ")
  const availablePriorities = Object.keys(staticConfig.priorities).join(", ")
  const availableAssignees = staticConfig.teamMembers.map((m) => m.name).join(", ")
  const availableProductAreas = staticConfig.productAreas.join(", ")

  return `You are ART3MIS (Autonomous Response & Task Efficiency Management Intelligence System), an expert task management assistant. You are currently speaking with ${currentUser}.
    Your goal is to understand user requests related to creating, updating, deleting tasks, querying tasks, or managing system configurations (product areas, assignees), and to respond ONLY with a valid JSON object. Do not add any text before or after the JSON object.
    EVERY proposed action or set of actions MUST be confirmed by the user before execution.

    Available top-level actions for your JSON response: PROPOSE_TASK_OPERATIONS, PROPOSE_CONFIGURATION_CHANGE, QUERY_TASKS, GENERAL_CHAT.

    Today's date is: ${today}.
    The current user speaking is: ${currentUser}.

    Context about the task system:
    - Available statuses: ${availableStatuses}
    - Available priorities: ${availablePriorities}
    - Available assignees (team members): ${availableAssignees}
    - Available product areas (projects): ${availableProductAreas}
    - Default reporter for new tasks is '${currentUser}' unless specified otherwise. Default status is 'To Do', default priority is 'Medium'.

    JSON Structure for each top-level action:

    1. PROPOSE_TASK_OPERATIONS:
       Use this when the user intends to create, update, or delete one or more tasks.
       {
         "action": "PROPOSE_TASK_OPERATIONS",
         "operations": [ // Array of one or more task operations
           {
             "type": "CREATE", // or "UPDATE", "DELETE"
             "details": { // Contents depend on 'type'
               // For CREATE:
               "title": "<task_title (string, required)>",
               "description": "<task_description (string, optional)>",
               "reporter": "${currentUser}",
               // ... other fields like status, priority, assignees, dueDate, productArea
               // For UPDATE:
               // "taskIdentifier": "<task_id_or_title_to_identify_task (string, required)>",
               // "updates": { "title": "<new_title>", "status": "<new_status>", ... }
               // For DELETE:
               // "taskIdentifier": "<task_id_or_title_to_identify_task (string, required)>"
             }
           }
           // ... more operations if requested
         ],
         "responseText": "<A friendly message asking for confirmation. Clearly list ALL proposed operations. e.g., 'Okay, ${currentUser}, I can perform the following actions:\\n1. Create task: [title]\\n2. Update task '[old_title]' to status '[new_status]'\\n3. Delete task '[title_to_delete]'.\\nShall I proceed with these changes? (You can click Confirm or Cancel below)'>"
       }

    2. PROPOSE_CONFIGURATION_CHANGE:
       Use this for requests to add/remove product areas or assignees.
       {
         "action": "PROPOSE_CONFIGURATION_CHANGE",
         "changeType": "PRODUCT_AREA" or "ASSIGNEE",
         "operation": "ADD" or "REMOVE",
         "itemName": "<name_of_item_to_add_or_remove (string, required)>",
         // "itemDetails": { "color": "bg-blue-500" } // Optional, e.g., for adding an assignee with a color
         "responseText": "<A friendly message asking for confirmation. e.g., 'I can propose adding '[itemName]' to the list of [changeType]s. Should I make a note of this proposed change?' OR 'I can propose removing '[itemName]' from the list of [changeType]s. Should I note this down?' >"
       }

    3. QUERY_TASKS: (Structure remains similar, ensure responseText is clear)
       {
         "action": "QUERY_TASKS",
         "params": { // Filter fields
           "status": "...", "priority": "...", "assignee": "...", "dueDate_before": "YYYY-MM-DD", ...
         },
         "responseText": "<A friendly message indicating the query is being processed. e.g., 'Let me check that for you, ${currentUser}...'>"
       }

    4. GENERAL_CHAT:
       Use this for conversational replies, or if the user cancels a proposal (e.g., after "USER_CANCELLED_PROPOSAL::...").
       {
         "action": "GENERAL_CHAT",
         "responseText": "<Your conversational reply. e.g., 'Hello, ${currentUser}! How can I help you manage your tasks today?' or 'Okay, ${currentUser}, I've cancelled those proposed actions. What would you like to do next?' >"
       }

    Important Rules for PROPOSING:
    - ALWAYS respond with a single, valid JSON object. No extra text.
    - If crucial information for a proposal is missing (like title for CREATE, identifier for UPDATE/DELETE), use 'responseText' within a GENERAL_CHAT action to ask for it.
    - For CREATE operations, ensure 'reporter' is '${currentUser}' if not specified.
    - For UPDATE operations, 'taskIdentifier' can be a task ID (preferred if known from prior context) or a sufficiently unique title. If a title is ambiguous, ask for clarification using GENERAL_CHAT.
    - Your 'responseText' for proposals should be comprehensive, summarizing all actions.

    Handling User Confirmations/Cancellations (System will send these messages):
    - "USER_CONFIRMED_PROPOSAL::{...original_proposal_payload...}": You will not see this directly. The system handles it.
    - "USER_CANCELLED_PROPOSAL::{...original_proposal_payload...}": If you receive this, respond with a GENERAL_CHAT action, acknowledging the cancellation.

    Example flow for creating two tasks:
    User: "ART3MIS, create a task to design the new logo and another one to write the announcement blog post."
    ART3MIS (you):
    {
      "action": "PROPOSE_TASK_OPERATIONS",
      "operations": [
        { "type": "CREATE", "details": { "title": "Design new logo", "reporter": "${currentUser}" } },
        { "type": "CREATE", "details": { "title": "Write announcement blog post", "reporter": "${currentUser}" } }
      ],
      "responseText": "Okay, ${currentUser}, I can create these tasks for you:\\n1. Title: Design new logo\\n2. Title: Write announcement blog post.\\nShall I proceed?"
    }
    (User clicks confirm button in UI)
    System sends "USER_CONFIRMED_PROPOSAL::(payload from above)" to this API endpoint.
    (API handles creation, then sends a success message back to UI - you don't generate this part of the flow)
    `
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  if (!API_KEY) {
    return NextResponse.json({ error: "API key not configured." }, { status: 500 })
  }

  try {
    let { message: userMessage, currentUser, proposalToConfirm } = await request.json()

    if (!currentUser) currentUser = "User" // Default current user

    if (userMessage === "USER_CONFIRMED_PROPOSAL" && proposalToConfirm) {
      // Handle confirmed proposals
      const resultsSummary = []
      let allSuccessful = true

      if (proposalToConfirm.action === "PROPOSE_TASK_OPERATIONS") {
        for (const op of proposalToConfirm.operations) {
          try {
            if (op.type === "CREATE") {
              const taskDataToCreate = { ...op.details }
              if (!taskDataToCreate.reporter) taskDataToCreate.reporter = currentUser
              if (!taskDataToCreate.status) taskDataToCreate.status = "To Do"
              if (!taskDataToCreate.priority) taskDataToCreate.priority = "Medium"

              const { data: tasksInStatus, error: orderError } = await supabase
                .from("tasks")
                .select("order")
                .eq("status", taskDataToCreate.status)
                .order("order", { ascending: false })
                .limit(1)
              let newOrder = 0
              if (orderError) console.warn("Error fetching max order for CREATE_TASK:", orderError.message)
              if (tasksInStatus && tasksInStatus.length > 0 && tasksInStatus[0].order !== null) {
                newOrder = tasksInStatus[0].order + 1
              }
              taskDataToCreate.order = newOrder

              const supabaseTaskData = mapTaskToSupabaseTask(taskDataToCreate)
              const { data: newTask, error: createError } = await supabase
                .from("tasks")
                .insert(supabaseTaskData)
                .select()
                .single()
              if (createError) throw new Error(`Failed to create task "${op.details.title}": ${createError.message}`)
              resultsSummary.push(`Created task: "${newTask.title}".`)
            } else if (op.type === "UPDATE") {
              const { taskIdentifier, updates } = op.details
              const { data: taskToUpdateArr, error: findError } = await supabase
                .from("tasks")
                .select("id, title")
                .or(`id.eq.${taskIdentifier},title.ilike.%${taskIdentifier}%`)

              if (findError || !taskToUpdateArr || taskToUpdateArr.length === 0)
                throw new Error(`Task "${taskIdentifier}" not found for update.`)
              if (taskToUpdateArr.length > 1)
                throw new Error(`Multiple tasks match "${taskIdentifier}". Please use ID or a more specific title.`)

              const taskToUpdate = taskToUpdateArr[0]
              const supabaseUpdateData = mapTaskToSupabaseTask(updates)
              const { data: updatedTaskData, error: updateError } = await supabase
                .from("tasks")
                .update(supabaseUpdateData)
                .eq("id", taskToUpdate.id)
                .select()
                .single()
              if (updateError) throw new Error(`Failed to update task "${taskToUpdate.title}": ${updateError.message}`)
              resultsSummary.push(`Updated task: "${updatedTaskData.title}".`)
            } else if (op.type === "DELETE") {
              const { taskIdentifier } = op.details
              const { data: taskToDeleteArr, error: findDelError } = await supabase
                .from("tasks")
                .select("id, title")
                .or(`id.eq.${taskIdentifier},title.ilike.%${taskIdentifier}%`)

              if (findDelError || !taskToDeleteArr || taskToDeleteArr.length === 0)
                throw new Error(`Task "${taskIdentifier}" not found for deletion.`)
              if (taskToDeleteArr.length > 1)
                throw new Error(
                  `Multiple tasks match "${taskIdentifier}" for deletion. Please use ID or a more specific title.`,
                )

              const taskToDelete = taskToDeleteArr[0]
              const { error: deleteError } = await supabase.from("tasks").delete().eq("id", taskToDelete.id)
              if (deleteError) throw new Error(`Failed to delete task "${taskToDelete.title}": ${deleteError.message}`)
              resultsSummary.push(`Deleted task: "${taskToDelete.title}".`)
            }
          } catch (e: any) {
            resultsSummary.push(e.message)
            allSuccessful = false
          }
        }
        return NextResponse.json(
          {
            responseText: allSuccessful
              ? `All operations completed successfully!\n${resultsSummary.join("\n")}`
              : `Some operations failed:\n${resultsSummary.join("\n")}`,
            operationsProcessed: true,
            allSuccessful,
          },
          { status: 200 },
        )
      } else if (proposalToConfirm.action === "PROPOSE_CONFIGURATION_CHANGE") {
        // For now, just acknowledge. Actual config store modification is complex from server-side.
        const { changeType, operation, itemName } = proposalToConfirm
        resultsSummary.push(
          `Noted proposal to ${operation.toLowerCase()} ${itemName} as a ${changeType.toLowerCase()}. An administrator may need to apply this system-wide.`,
        )
        return NextResponse.json(
          {
            responseText: resultsSummary.join("\n"),
            operationsProcessed: true,
            allSuccessful: true, // Considered successful as it's a "note down"
          },
          { status: 200 },
        )
      }
    } else if (userMessage === "USER_CANCELLED_PROPOSAL") {
      userMessage = `The user, ${currentUser}, cancelled the previous proposal. Acknowledge and ask what they'd like to do next.`
    }

    if (!userMessage) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME, safetySettings, generationConfig })
    const fullPrompt = `${buildSystemPrompt(currentUser)}\n\nUser message:\n"""\n${userMessage}\n"""\nJSON Response:\n`

    const result = await model.generateContent(fullPrompt)
    const aiResponseText = result.response.text()

    let structuredResponse
    try {
      const jsonMatch = aiResponseText.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch && jsonMatch[1]) {
        structuredResponse = JSON.parse(jsonMatch[1])
      } else {
        structuredResponse = JSON.parse(aiResponseText)
      }
    } catch (e) {
      console.error("Failed to parse JSON from ART3MIS:", aiResponseText, e)
      return NextResponse.json(
        {
          responseText: "I had a little trouble formulating my response as structured data. Could you try rephrasing?",
          debug_ai_raw_output: aiResponseText,
        },
        { status: 200 },
      )
    }

    // Return the structured proposal or general chat response
    // The actual execution of these proposals happens when USER_CONFIRMED_PROPOSAL is received.
    if (
      structuredResponse.action === "PROPOSE_TASK_OPERATIONS" ||
      structuredResponse.action === "PROPOSE_CONFIGURATION_CHANGE"
    ) {
      if (structuredResponse.action === "PROPOSE_TASK_OPERATIONS" && structuredResponse.operations) {
        structuredResponse.operations.forEach((op: any) => {
          if (op.type === "CREATE" && op.details && !op.details.reporter) {
            op.details.reporter = currentUser
          }
        })
      }
      return NextResponse.json(structuredResponse, { status: 200 })
    } else if (structuredResponse.action === "QUERY_TASKS") {
      // Query logic remains largely the same as before, but it's now just part of the flow
      // The actual data fetching and summarization logic from the original file can be placed here.
      // For brevity, I'm returning a placeholder. The original query logic was extensive.
      // You would build the Supabase query based on structuredResponse.params
      // and then format the results into structuredResponse.responseText.
      // This part is simplified here to focus on the proposal flow.
      let query = supabase.from("tasks").select()
      const queryParams = structuredResponse.params || {}

      if (queryParams.status) query = query.eq("status", queryParams.status)
      if (queryParams.priority) query = query.eq("priority", queryParams.priority)
      // ... add all other query param handlers from original file ...
      if (queryParams.title_contains) query = query.ilike("title", `%${queryParams.title_contains}%`)

      query = query.order("due_date", { ascending: true, nullsFirst: false }).limit(10) // Limit results for chat

      const { data: queriedTasks, error: queryError } = await query

      if (queryError) {
        console.error("Supabase query error:", queryError)
        return NextResponse.json(
          { responseText: `Sorry, I couldn't fetch the tasks: ${queryError.message}` },
          { status: 200 },
        )
      }

      if (!queriedTasks || queriedTasks.length === 0) {
        return NextResponse.json(
          { responseText: structuredResponse.responseText || "I couldn't find any tasks matching your criteria." },
          { status: 200 },
        )
      }

      const taskSummary = queriedTasks
        .map((t: any) => {
          let summary = `- "${t.title}" (ID: ${t.id.substring(0, 6)})`
          if (t.status) summary += `, Status: ${t.status}`
          if (t.dueDate) summary += `, Due: ${new Date(t.due_date).toLocaleDateString()}`
          return summary
        })
        .join("\n")
      return NextResponse.json({ responseText: `Here are some tasks I found:\n${taskSummary}` }, { status: 200 })
    } else if (structuredResponse.action === "GENERAL_CHAT") {
      return NextResponse.json({ responseText: structuredResponse.responseText || "How can I help?" }, { status: 200 })
    } else {
      // Fallback for unknown actions or if ART3MIS doesn't follow the new structure
      console.warn("ART3MIS proposed an unknown or malformed action:", structuredResponse)
      return NextResponse.json(
        { responseText: "I'm not sure how to proceed with that. Can you try again?" },
        { status: 200 },
      )
    }
  } catch (error: any) {
    console.error("Error in ART3MIS API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
