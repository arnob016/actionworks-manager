import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, type GenerationConfig } from "@google/generative-ai"
import { cookies } from "next/headers"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { staticConfig } from "@/lib/config"
import type { Task, TaskFormData } from "@/lib/types"

const MODEL_NAME = "models/gemini-2.0-flash"
const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY as string

if (!API_KEY) {
  console.error("GOOGLE_GENERATIVE_AI_API_KEY is not set.")
}

const genAI = new GoogleGenerativeAI(API_KEY)

const generationConfig: GenerationConfig = {
  temperature: 0.3,
  topK: 1,
  topP: 1,
  maxOutputTokens: 4096,
}

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
  const availablePriorities = staticConfig.priorities.map((p) => p.name).join(", ")
  const availableAssignees = staticConfig.teamMembers.map((m) => m.name).join(", ")
  const availableProductAreas = staticConfig.productAreas.join(", ")

  return `You are ART3MIS (Autonomous Response & Task Efficiency Management Intelligence System), an expert task management assistant. You are currently speaking with ${currentUser}. Your goal is to understand user requests related to creating, updating, or querying tasks, and to respond ONLY with a valid JSON object. Do not add any text before or after the JSON object.

  Available actions are: PROPOSE_TASK_CREATION, CREATE_TASK, UPDATE_TASK, QUERY_TASKS, GENERAL_CHAT.

  Today's date is: ${today}.
  The current user speaking is: ${currentUser}.

  Context about the task system:
  - Available statuses: ${availableStatuses}
  - Available priorities: ${availablePriorities}
  - Available assignees: ${availableAssignees} (If assignees are not specified for a new task, you can ask or leave it unassigned. If a single assignee is mentioned in context of creation, use them.)
  - Available product areas/projects: ${availableProductAreas}
  - Default reporter for new tasks is '${currentUser}' unless specified otherwise by the user. Default status is 'To Do', default priority is 'Medium'.

  JSON Structure for each action:

  1. PROPOSE_TASK_CREATION:
     If the user expresses intent to create a task, first propose it for confirmation.
     {
       "action": "PROPOSE_TASK_CREATION",
       "taskDetails": {
         "title": "<task_title (string, required)>",
         "description": "<task_description (string, optional)>",
         "reporter": "${currentUser}",
         // ... other fields like status, priority, assignees, dueDate, productArea
       },
       "responseText": "<A friendly message asking for confirmation. Clearly list the key details of the task you are proposing. e.g., 'Okay, ${currentUser}, I can create this task for you:\\nTitle: [title]\\nDue: [dueDate]\\nAssignees: [assignees].\\nShall I proceed? (You can click Confirm Task or Cancel below)'>"
     }

  2. CREATE_TASK:
     This action is used AFTER the user has confirmed a task proposal via a special message like "USER_CONFIRMED_TASK_CREATION::{...details...}".
     The 'params' for this action will be directly extracted from that special message by the system.
     {
       "action": "CREATE_TASK",
       "params": {
         "title": "<task_title (string, required)>",
         "reporter": "${currentUser}",
         // ... all other fields from the confirmed taskDetails
       },
       "responseText": "<A friendly confirmation message AFTER the task is created by the system. e.g., 'Alright, ${currentUser}, I've created the task: [task title].'>"
     }

  3. UPDATE_TASK:
     {
       "action": "UPDATE_TASK",
       "params": {
         "taskIdentifier": "<task_id_or_title_to_identify_task (string, required)>",
         "updates": {
           "title": "<new_task_title (string, optional)>",
           // ... other updatable fields
         }
       },
       "responseText": "<A friendly confirmation message. e.g., 'Task [task title] updated successfully, ${currentUser}.'>"
     }

  4. QUERY_TASKS:
     {
       "action": "QUERY_TASKS",
       "params": { // Include parameters to filter tasks.
         // ... filter fields
       },
       "responseText": "<A friendly message indicating the query is being processed. e.g., 'Let me check that for you, ${currentUser}...'>"
     }

  5. GENERAL_CHAT:
     Use this for conversational replies, or if the user cancels a task proposal (e.g., after "USER_CANCELLED_TASK_CREATION::...").
     {
       "action": "GENERAL_CHAT",
       "responseText": "<Your conversational reply. e.g., 'Hello, ${currentUser}! I'm ART3MIS. How can I help you manage your tasks today?' or 'Okay, ${currentUser}, I've cancelled that. What would you like to do next?' >"
     }

  Important Rules:
  - ALWAYS respond with a single, valid JSON object. No extra text.
  - If the user's input starts with "USER_CONFIRMED_TASK_CREATION::", the system will handle the task creation directly using the JSON payload.
  - If the user's input starts with "USER_CANCELLED_TASK_CREATION::", respond with a GENERAL_CHAT action, acknowledging the cancellation.
  - For regular user messages, if intent is to create, use PROPOSE_TASK_CREATION.
  - If crucial information for PROPOSE_TASK_CREATION is missing (like title), use 'responseText' to ask for it, and set action to GENERAL_CHAT.
  - When proposing or creating a task, ensure the 'reporter' field is set to '${currentUser}' if not otherwise specified by the user.
  `
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)

  if (!API_KEY) {
    return NextResponse.json({ error: "API key not configured." }, { status: 500 })
  }

  try {
    let { message: userMessage, currentUser } = await request.json()
    if (!userMessage) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 })
    }
    if (!currentUser) {
      currentUser = "User"
    }

    if (userMessage.startsWith("USER_CONFIRMED_TASK_CREATION::")) {
      try {
        const taskDetailsJson = userMessage.substring("USER_CONFIRMED_TASK_CREATION::".length)
        const taskDataToCreate = JSON.parse(taskDetailsJson)

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

        if (createError) {
          console.error("Supabase create error (direct confirmation):", createError)
          return NextResponse.json(
            { responseText: `Sorry, I couldn't create the task: ${createError.message}` },
            { status: 200 },
          )
        }
        return NextResponse.json(
          {
            responseText: `Task "${newTask.title}" has been created successfully!`,
            taskCreated: true,
          },
          { status: 200 },
        )
      } catch (e) {
        console.error("Error processing direct task confirmation:", e)
        return NextResponse.json(
          { responseText: "There was an error confirming the task creation. Please try again." },
          { status: 200 },
        )
      }
    } else if (userMessage.startsWith("USER_CANCELLED_TASK_CREATION::")) {
      userMessage = `The user, ${currentUser}, cancelled the previous task proposal. Acknowledge and ask what they'd like to do next.`
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME })
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
          responseText: "I had a little trouble understanding that. Could you try rephrasing?",
          debug_ai_raw_output: aiResponseText,
        },
        { status: 200 },
      )
    }

    switch (structuredResponse.action) {
      case "PROPOSE_TASK_CREATION":
        if (structuredResponse.taskDetails && !structuredResponse.taskDetails.reporter) {
          structuredResponse.taskDetails.reporter = currentUser
        }
        return NextResponse.json(
          {
            action: "PROPOSE_TASK_CREATION",
            taskDetails: structuredResponse.taskDetails,
            responseText: structuredResponse.responseText,
          },
          { status: 200 },
        )
      case "CREATE_TASK":
        const taskDataToCreate = structuredResponse.params
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
        if (orderError) console.warn("Error fetching max order for AI CREATE_TASK:", orderError.message)
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

        if (createError) {
          console.error("Supabase create error (AI fallback):", createError)
          return NextResponse.json(
            { responseText: `Sorry, I couldn't create the task: ${createError.message}` },
            { status: 200 },
          )
        }
        return NextResponse.json(
          {
            responseText: structuredResponse.responseText || `Task "${newTask.title}" created successfully.`,
            taskCreated: true,
          },
          { status: 200 },
        )

      case "UPDATE_TASK":
        const { taskIdentifier, updates } = structuredResponse.params
        let taskToUpdate
        const { data: taskById } = await supabase.from("tasks").select().eq("id", taskIdentifier).single()

        if (taskById) {
          taskToUpdate = taskById
        } else {
          const { data: taskByTitle, error: titleError } = await supabase
            .from("tasks")
            .select()
            .ilike("title", `%${taskIdentifier}%`)

          if (titleError || !taskByTitle || taskByTitle.length === 0) {
            return NextResponse.json(
              { responseText: `I couldn't find a task matching "${taskIdentifier}".` },
              { status: 200 },
            )
          }
          if (taskByTitle.length > 1) {
            return NextResponse.json(
              {
                responseText: `I found multiple tasks matching "${taskIdentifier}". Can you provide an ID or be more specific?`,
              },
              { status: 200 },
            )
          }
          taskToUpdate = taskByTitle[0]
        }

        if (!taskToUpdate) {
          return NextResponse.json({ responseText: `I couldn't find the task "${taskIdentifier}".` }, { status: 200 })
        }

        const supabaseUpdateData = mapTaskToSupabaseTask(updates)
        const { data: updatedTaskData, error: updateError } = await supabase
          .from("tasks")
          .update(supabaseUpdateData)
          .eq("id", taskToUpdate.id)
          .select()
          .single()

        if (updateError) {
          console.error("Supabase update error:", updateError)
          return NextResponse.json(
            { responseText: `Sorry, I couldn't update the task: ${updateError.message}` },
            { status: 200 },
          )
        }
        return NextResponse.json(
          {
            responseText: structuredResponse.responseText || `Task "${updatedTaskData.title}" updated.`,
            taskUpdated: true,
          },
          { status: 200 },
        )

      case "QUERY_TASKS":
        let query = supabase.from("tasks").select()
        const queryParams = structuredResponse.params

        if (queryParams.status) query = query.eq("status", queryParams.status)
        if (queryParams.priority) query = query.eq("priority", queryParams.priority)
        if (queryParams.assignee) query = query.contains("assignees", [queryParams.assignee])
        if (queryParams.assignees_include_any && queryParams.assignees_include_any.length > 0) {
          query = query.or(queryParams.assignees_include_any.map((a: string) => `assignees.cs.{${a}}`).join(","))
        }
        if (queryParams.dueDate_equals) query = query.eq("due_date", queryParams.dueDate_equals)
        if (queryParams.dueDate_before) query = query.lte("due_date", queryParams.dueDate_before)
        if (queryParams.dueDate_after) query = query.gte("due_date", queryParams.dueDate_after)
        if (queryParams.startDate_equals) query = query.eq("start_date", queryParams.startDate_equals)
        if (queryParams.title_contains) query = query.ilike("title", `%${queryParams.title_contains}%`)
        if (queryParams.description_contains)
          query = query.ilike("description", `%${queryParams.description_contains}%`)
        if (queryParams.productArea) query = query.eq("product_area", queryParams.productArea)
        if (queryParams.is_overdue === true) {
          const todayStr = new Date().toISOString().split("T")[0]
          query = query.lt("due_date", todayStr).neq("status", "Completed").neq("status", "Done")
        }

        query = query.order("due_date", { ascending: true, nullsFirst: false })

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
            { responseText: "I couldn't find any tasks matching your criteria." },
            { status: 200 },
          )
        }

        const taskSummary = queriedTasks
          .map((t) => {
            const task = mapSupabaseTaskToTask(t)
            let summary = `- "${task.title}" (ID: ${task.id.substring(0, 6)})`
            if (task.status) summary += `, Status: ${task.status}`
            if (task.priority) summary += `, Priority: ${task.priority}`
            if (task.dueDate) summary += `, Due: ${task.dueDate}`
            if (task.assignees && task.assignees.length > 0) summary += `, Assignees: ${task.assignees.join(", ")}`
            return summary
          })
          .join("\n")

        return NextResponse.json({ responseText: `Here are the tasks I found:\n${taskSummary}` }, { status: 200 })

      case "GENERAL_CHAT":
      default:
        return NextResponse.json(
          { responseText: structuredResponse.responseText || "I'm not sure how to help with that yet." },
          { status: 200 },
        )
    }
  } catch (error: any) {
    console.error("Error in ART3MIS API:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
