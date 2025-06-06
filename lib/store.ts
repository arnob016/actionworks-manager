"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  Task,
  UserPreferences,
  ConfigItem,
  TeamMember,
  Comment,
  Attachment,
  StatusConfig,
  TaskFormData,
} from "./types"
import { staticConfig as initialStaticConfig } from "./config"
import { toast } from "sonner"
// Corrected import:
import { createSupabaseClient } from "./supabase/client"

// Corrected usage:
const supabase = createSupabaseClient()

// Helper to map Supabase task (snake_case) to our Task type (camelCase)
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
    isPrivate: supabaseTask.is_private || false,
    attachments: [], // attachments and comments are not in DB yet
    comments: [],
    createdAt: supabaseTask.created_at,
    updatedAt: supabaseTask.updated_at,
  }
}

// Helper to map our Task/TaskFormData to Supabase task (snake_case)
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
  if (taskData.isPrivate !== undefined) supabaseData.is_private = taskData.isPrivate
  return supabaseData
}

const getSafeArray = (inputArray: unknown, defaultArray: string[] = []): string[] => {
  if (Array.isArray(inputArray)) {
    return [...inputArray.map(String)]
  }
  return defaultArray
}

const getSafeStatuses = (statusesArray: unknown, defaultStatuses: StatusConfig[]): StatusConfig[] => {
  if (Array.isArray(statusesArray)) {
    if (statusesArray.every((s) => typeof s === "string")) {
      return statusesArray.map((name) => ({ name, wipLimit: null }))
    }
    if (statusesArray.every((s) => typeof s === "object" && s !== null && typeof s.name === "string")) {
      return statusesArray.map((s) => ({
        name: s.name,
        wipLimit: typeof s.wipLimit === "number" ? s.wipLimit : null,
      }))
    }
  }
  return defaultStatuses
}

const getSafePriorities = (prioritiesObj: unknown, defaultPrios: ConfigItem[]): ConfigItem[] => {
  if (typeof prioritiesObj === "object" && prioritiesObj !== null && !Array.isArray(prioritiesObj)) {
    const entries = Object.entries(prioritiesObj)
    if (entries.every(([_, color]) => typeof color === "string")) {
      return entries.map(([name, color]) => ({ name, color: color as string }))
    }
  }
  return defaultPrios
}

const getSafeTeamMembers = (membersArray: unknown, defaultMembers: TeamMember[]): TeamMember[] => {
  if (Array.isArray(membersArray)) {
    return membersArray
      .filter((m) => typeof m === "object" && m !== null && typeof m.name === "string" && typeof m.color === "string")
      .map((m) => ({ name: m.name, color: m.color })) as TeamMember[]
  }
  return defaultMembers
}

const DEFAULT_STATUSES_CONFIG: StatusConfig[] = [
  { name: "New", wipLimit: null },
  { name: "Backlog", wipLimit: null },
  { name: "To Do", wipLimit: 5 },
  { name: "In Progress", wipLimit: 3 },
  { name: "In Review", wipLimit: 2 },
  { name: "Done", wipLimit: null },
  { name: "Completed", wipLimit: null },
]
const DEFAULT_PRIORITIES: ConfigItem[] = [
  { name: "Highest", color: "bg-red-500" },
  { name: "High", color: "bg-orange-500" },
  { name: "Medium", color: "bg-yellow-500" },
  { name: "Low", color: "bg-green-500" },
]
const DEFAULT_PRODUCT_AREAS = ["Core Platform", "User Interface", "API"]
const DEFAULT_EFFORT_SIZES = ["XS", "S", "M", "L", "XL"]
const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  { name: "Zonaid", color: "bg-blue-500" },
  { name: "Alice", color: "bg-pink-500" },
]

interface TaskStore {
  tasks: Task[]
  isLoading: boolean
  fetchTasks: () => Promise<void>
  addTask: (taskData: Omit<TaskFormData, "id" | "order">) => Promise<void>
  updateTask: (id: string, updates: Partial<TaskFormData>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  deleteTasks: (ids: string[]) => Promise<void>
  moveTask: (id: string, newStatus: string, newOrder?: number) => Promise<void>
  reorderTaskInStatus: (taskId: string, oldOrder: number, newOrder: number, status: string) => Promise<void>
  addDependency: (taskId: string, dependencyId: string) => Promise<void>
  removeDependency: (taskId: string, dependencyId: string) => Promise<void>
  toggleTaskCompletion: (taskId: string) => Promise<void>
  addCommentToTask: (taskId: string, comment: Omit<Comment, "id" | "createdAt">) => void
  addAttachmentToTask: (taskId: string, attachment: Omit<Attachment, "id" | "uploadedAt">) => void
  addTagToTask: (taskId: string, tag: string) => Promise<void>
  removeTagFromTask: (taskId: string, tag: string) => Promise<void>
  getSubtasks: (parentId: string) => Task[]
  reorderTask: (draggedId: string, targetId: string) => Promise<void>
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  isLoading: true,
  fetchTasks: async () => {
    set({ isLoading: true })
    const { data, error } = await supabase.from("tasks").select("*").order("order", { ascending: true })
    if (error) {
      toast.error("Failed to fetch tasks: " + error.message)
      set({ tasks: [], isLoading: false })
      return
    }
    set({ tasks: data.map(mapSupabaseTaskToTask), isLoading: false })
  },

  addTask: async (taskData) => {
    const config = useConfigStore.getState()
    const defaultStatus = config.statuses[0]?.name || "New"
    const reporter = taskData.reporter || "Zonaid"

    const currentTasksInStatus = get().tasks.filter((t) => t.status === (taskData.status || defaultStatus))
    const maxOrder = currentTasksInStatus.reduce((max, t) => Math.max(max, t.order || 0), -1)

    const supabaseTaskData = mapTaskToSupabaseTask({
      ...taskData,
      reporter,
      status: taskData.status || defaultStatus,
      order: maxOrder + 1,
    })

    const { data, error } = await supabase.from("tasks").insert(supabaseTaskData).select().single()

    if (error) {
      toast.error("Failed to add task: " + error.message)
      return
    }
    if (data) {
      const newTask = mapSupabaseTaskToTask(data)
      set((state) => ({ tasks: [...state.tasks, newTask].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) }))
      toast.success(`Task "${newTask.title}" created successfully!`)
    }
  },

  updateTask: async (id, updates) => {
    const supabaseTaskData = mapTaskToSupabaseTask(updates)
    const { data, error } = await supabase.from("tasks").update(supabaseTaskData).eq("id", id).select().single()

    if (error) {
      toast.error("Failed to update task: " + error.message)
      return
    }
    if (data) {
      const updatedTask = mapSupabaseTaskToTask(data)
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? updatedTask : task)),
      }))
      toast.info(`Task "${updatedTask.title}" updated.`)
    }
  },

  deleteTask: async (id) => {
    const taskToDelete = get().tasks.find((t) => t.id === id)
    if (!taskToDelete) return

    const { error } = await supabase.from("tasks").delete().eq("id", id)

    if (error) {
      toast.error("Failed to delete task: " + error.message)
      return
    }
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    }))
    toast.error(`Task "${taskToDelete.title}" deleted.`)
  },
  deleteTasks: async (ids) => {
    let deletedCount = 0
    for (const id of ids) {
      const { error } = await supabase.from("tasks").delete().eq("id", id)
      if (!error) {
        deletedCount++
      } else {
        toast.error(`Failed to delete task ${id}: ${error.message}`)
      }
    }
    if (deletedCount > 0) {
      set((state) => ({
        tasks: state.tasks.filter((task) => !ids.includes(task.id)),
      }))
      toast.error(`${deletedCount} task(s) deleted.`)
    }
  },

  moveTask: async (id, newStatus, newOrderValue) => {
    const tasks = get().tasks
    const taskToMove = tasks.find((t) => t.id === id)
    if (!taskToMove) return

    const oldTasks = [...tasks]
    const optimisticTasks = tasks
      .map((t) => {
        if (t.id === id) return { ...t, status: newStatus, order: newOrderValue ?? t.order }
        return t
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    set({ tasks: optimisticTasks })

    const { error } = await supabase.from("tasks").update({ status: newStatus, order: newOrderValue }).eq("id", id)

    if (error) {
      toast.error(`Failed to move task: ${error.message}`)
      set({ tasks: oldTasks })
      return
    }
    await get().fetchTasks()
    toast.info(`Task "${taskToMove.title}" moved to ${newStatus}.`)
  },

  reorderTaskInStatus: async (taskId, oldOrder, newOrder, status) => {
    const { error } = await supabase.from("tasks").update({ order: newOrder }).eq("id", taskId)
    if (error) {
      toast.error("Failed to reorder task: " + error.message)
      return
    }
    await get().fetchTasks()
    toast.info("Task reordered in status.")
  },
  reorderTask: async (draggedId, targetId) => {
    const tasks = [...get().tasks]
    const draggedIndex = tasks.findIndex((t) => t.id === draggedId)
    const targetIndex = tasks.findIndex((t) => t.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const [draggedItem] = tasks.splice(draggedIndex, 1)
    tasks.splice(targetIndex, 0, draggedItem)

    const updates = tasks.map((task, index) => supabase.from("tasks").update({ order: index }).eq("id", task.id))

    const results = await Promise.all(updates)
    const anyError = results.some((result) => result.error)

    if (anyError) {
      toast.error("Failed to reorder tasks. Some updates failed.")
      await get().fetchTasks()
    } else {
      set({ tasks: tasks.map((t, i) => ({ ...t, order: i })) })
      toast.success("Task order updated.")
    }
  },

  addDependency: async (taskId, dependencyId) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return
    const newDependsOn = Array.from(new Set([...(task.dependsOn || []), dependencyId]))
    const { error } = await supabase.from("tasks").update({ depends_on: newDependsOn }).eq("id", taskId)
    if (error) {
      toast.error("Failed to add dependency: " + error.message)
      return
    }
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, dependsOn: newDependsOn } : t)),
    }))
    toast.info("Dependency added.")
  },

  removeDependency: async (taskId, dependencyId) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return
    const newDependsOn = (task.dependsOn || []).filter((id) => id !== dependencyId)
    const { error } = await supabase.from("tasks").update({ depends_on: newDependsOn }).eq("id", taskId)
    if (error) {
      toast.error("Failed to remove dependency: " + error.message)
      return
    }
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, dependsOn: newDependsOn } : t)),
    }))
    toast.warn("Dependency removed.")
  },

  toggleTaskCompletion: async (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return

    const config = useConfigStore.getState()
    const firstStatus = config.statuses[0]?.name || "New"
    const completedStatus = config.statuses.find((s) => s.name.toLowerCase() === "completed")?.name || "Completed"

    const newStatus = task.status === completedStatus ? firstStatus : completedStatus

    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId)
    if (error) {
      toast.error("Failed to toggle task completion: " + error.message)
      return
    }
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    }))
    toast.info(`Task "${task.title}" marked as ${newStatus === completedStatus ? "completed" : "incomplete"}.`)
  },

  addTagToTask: async (taskId, tag) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return
    const newTags = Array.from(new Set([...(task.tags || []), tag.trim()]))
    const { error } = await supabase.from("tasks").update({ tags: newTags }).eq("id", taskId)
    if (error) {
      toast.error("Failed to add tag: " + error.message)
      return
    }
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, tags: newTags } : t)),
    }))
  },
  removeTagFromTask: async (taskId, tag) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return
    const newTags = (task.tags || []).filter((t) => t !== tag)
    const { error } = await supabase.from("tasks").update({ tags: newTags }).eq("id", taskId)
    if (error) {
      toast.error("Failed to remove tag: " + error.message)
      return
    }
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, tags: newTags } : t)),
    }))
  },

  addCommentToTask: (taskId, commentData) => {
    toast.info("Adding comments to Supabase not yet implemented.")
    const newComment: Comment = { ...commentData, id: `cmt-${Date.now()}`, createdAt: new Date().toISOString() }
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, comments: [...(task.comments || []), newComment] } : task,
      ),
    }))
  },
  addAttachmentToTask: (taskId, attachmentData) => {
    toast.info("Adding attachments to Supabase not yet implemented.")
    const newAttachment: Attachment = {
      ...attachmentData,
      id: `att-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    }
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, attachments: [...(task.attachments || []), newAttachment] } : task,
      ),
    }))
  },
  getSubtasks: (parentId: string) => {
    return get().tasks.filter((task) => task.parentId === parentId)
  },
}))

interface UserPreferencesStore {
  preferences: UserPreferences
  setPreferences: (prefs: Partial<UserPreferences>) => void
}

export const useUserPreferencesStore = create<UserPreferencesStore>()(
  persist(
    (set) => ({
      preferences: {
        viewMode: "kanban",
        darkMode: true,
        tableColumnWidths: {},
        layout: "navbar",
        font: "inter",
        fontSize: 14,
        lineHeight: 1.5,
      },
      setPreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),
    }),
    {
      name: "user-preferences-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

interface ConfigStoreState {
  statuses: StatusConfig[]
  priorities: ConfigItem[]
  productAreas: string[]
  effortSizes: string[]
  teamMembers: TeamMember[]

  addStatus: (name: string) => void
  removeStatus: (name: string) => void
  reorderStatuses: (oldIndex: number, newIndex: number) => void
  updateStatusWipLimit: (name: string, limit: number | null) => void

  addPriority: (priority: ConfigItem) => void
  removePriority: (name: string) => void
  updatePriorityColor: (name: string, color: string) => void
  addProductArea: (name: string) => void
  removeProductArea: (name: string) => void
  addEffortSize: (name: string) => void
  removeEffortSize: (name: string) => void
  addTeamMember: (member: TeamMember) => void
  removeTeamMember: (name: string) => void
  updateTeamMemberColor: (name: string, color: string) => void
  getPriorityColorByName: (name: string) => string | undefined
  getTeamMemberColorByName: (name: string) => string | undefined
}

export const useConfigStore = create<ConfigStoreState>()(
  persist(
    (set, get) => ({
      statuses: getSafeStatuses(initialStaticConfig?.statuses, DEFAULT_STATUSES_CONFIG),
      priorities: getSafePriorities(initialStaticConfig?.priorities, DEFAULT_PRIORITIES),
      productAreas: getSafeArray(initialStaticConfig?.productAreas, DEFAULT_PRODUCT_AREAS),
      effortSizes: getSafeArray(initialStaticConfig?.effortSizes, DEFAULT_EFFORT_SIZES),
      teamMembers: getSafeTeamMembers(initialStaticConfig?.teamMembers, DEFAULT_TEAM_MEMBERS),

      addStatus: (name) =>
        set((state) => {
          if (state.statuses.some((s) => s.name === name)) {
            toast.error(`Status "${name}" already exists.`)
            return state
          }
          toast.success(`Status "${name}" added.`)
          return { statuses: [...state.statuses, { name, wipLimit: null }] }
        }),
      removeStatus: (name) =>
        set((state) => {
          toast.info(`Status "${name}" removed.`)
          return { statuses: state.statuses.filter((s) => s.name !== name) }
        }),
      reorderStatuses: (oldIndex, newIndex) =>
        set((state) => {
          if (oldIndex < 0 || oldIndex >= state.statuses.length || newIndex < 0 || newIndex >= state.statuses.length) {
            return state
          }
          const newStatuses = [...state.statuses]
          const [movedItem] = newStatuses.splice(oldIndex, 1)
          newStatuses.splice(newIndex, 0, movedItem)
          toast.info("Statuses reordered.")
          return { statuses: newStatuses }
        }),
      updateStatusWipLimit: (name, limit) =>
        set((state) => {
          toast.info(`WIP limit for "${name}" updated to ${limit === null ? "none" : limit}.`)
          return {
            statuses: state.statuses.map((s) => (s.name === name ? { ...s, wipLimit: limit } : s)),
          }
        }),

      addPriority: (priority) =>
        set((state) => {
          const existing = state.priorities.find((p) => p.name === priority.name)
          if (existing) {
            toast.error(`Priority "${priority.name}" already exists. Updating color.`)
            return { priorities: state.priorities.map((p) => (p.name === priority.name ? priority : p)) }
          }
          toast.success(`Priority "${priority.name}" added.`)
          return { priorities: [...state.priorities, priority] }
        }),
      removePriority: (name) =>
        set((state) => {
          toast.info(`Priority "${name}" removed.`)
          return { priorities: state.priorities.filter((p) => p.name !== name) }
        }),
      updatePriorityColor: (name, color) =>
        set((state) => {
          toast.info(`Color for priority "${name}" updated.`)
          return {
            priorities: state.priorities.map((p) => (p.name === name ? { ...p, color } : p)),
          }
        }),

      addProductArea: (name) =>
        set((state) => {
          if (state.productAreas.includes(name)) {
            toast.error(`Product Area "${name}" already exists.`)
            return state
          }
          toast.success(`Product Area "${name}" added.`)
          return { productAreas: Array.from(new Set([...state.productAreas, name])) }
        }),
      removeProductArea: (name) =>
        set((state) => {
          toast.info(`Product Area "${name}" removed.`)
          return { productAreas: state.productAreas.filter((pa) => pa !== name) }
        }),

      addEffortSize: (name) =>
        set((state) => {
          if (state.effortSizes.includes(name)) {
            toast.error(`Effort Size "${name}" already exists.`)
            return state
          }
          toast.success(`Effort Size "${name}" added.`)
          return { effortSizes: Array.from(new Set([...state.effortSizes, name])) }
        }),
      removeEffortSize: (name) =>
        set((state) => {
          toast.info(`Effort Size "${name}" removed.`)
          return { effortSizes: state.effortSizes.filter((es) => es !== name) }
        }),

      addTeamMember: (member) =>
        set((state) => {
          const existing = state.teamMembers.find((tm) => tm.name === member.name)
          if (existing) {
            toast.error(`Team Member "${member.name}" already exists. Updating color.`)
            return { teamMembers: state.teamMembers.map((tm) => (tm.name === member.name ? member : tm)) }
          }
          toast.success(`Team Member "${member.name}" added.`)
          return { teamMembers: [...state.teamMembers, member] }
        }),
      removeTeamMember: (name) =>
        set((state) => {
          toast.info(`Team Member "${name}" removed.`)
          return { teamMembers: state.teamMembers.filter((tm) => tm.name !== name) }
        }),
      updateTeamMemberColor: (name, color) =>
        set((state) => {
          toast.info(`Color for Team Member "${name}" updated.`)
          return {
            teamMembers: state.teamMembers.map((tm) => (tm.name === name ? { ...tm, color } : tm)),
          }
        }),

      getPriorityColorByName: (name) => {
        const priorities = get().priorities
        return priorities.find((p) => p.name === name)?.color || DEFAULT_PRIORITIES[0].color
      },
      getTeamMemberColorByName: (name) => {
        const teamMembers = get().teamMembers
        return teamMembers.find((tm) => tm.name === name)?.color || DEFAULT_TEAM_MEMBERS[0].color
      },
    }),
    {
      name: "app-config-storage-v2",
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
