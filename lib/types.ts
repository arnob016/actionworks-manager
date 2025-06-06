export interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  assignees: string[]
  startDate: string | null // Can be null
  dueDate: string | null // Can be null
  effort: string | null
  productArea: string | null
  order?: number
  dependsOn?: string[]

  reporter: string | null // Can be null
  parentId?: string | null
  tags?: string[]
  attachments?: Attachment[] // Will remain client-side for now
  comments?: Comment[] // Will remain client-side for now
  isPrivate?: boolean
  createdAt?: string // Added for Supabase
  updatedAt?: string // Added for Supabase
}

export interface TaskFormData {
  title: string
  description: string
  status: string
  priority: string
  assignees: string[]
  startDate: string | null
  dueDate: string | null
  effort: string | null
  productArea: string | null
  order?: number
  dependsOn?: string[]

  reporter: string | null
  parentId?: string | null
  tags?: string[]
  isPrivate?: boolean
}

export type ViewMode = "calendar" | "kanban" | "table" | "timeline"

export interface StatusConfig {
  name: string
  wipLimit?: number | null
}

export interface ConfigItem {
  name: string
  color: string
}

export interface TeamMember {
  name: string
  color: string
}

// Config interface might be deprecated if settings move to DB
export interface Config {
  statuses: StatusConfig[]
  priorities: Record<string, string> // This was Record, but store uses ConfigItem[]
  effortSizes: string[]
  productAreas: string[]
  teamMembers: TeamMember[]
  viewsEnabled: ViewMode[]
}

export interface UserPreferences {
  viewMode: ViewMode
  darkMode: boolean
  tableColumnWidths?: Record<string, number>
  layout: "navbar" | "sidebar"
  font: "inter" | "roboto" | "source-code-pro" | "lato" | "open-sans"
  fontSize: number
  lineHeight: number
}

export interface Comment {
  id: string
  author: string
  content: string
  createdAt: string
  parentId?: string
}

export interface Attachment {
  id: string
  fileName: string
  url: string
  fileType: string
  uploadedAt: string
}
