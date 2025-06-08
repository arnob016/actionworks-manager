import type { Task, TeamMember } from "./types"

// Define color palettes for statuses and product areas
// Tailwind classes are used directly. Ensure these are available or adjust as needed.
// Using text-color and bg-color for better contrast control.
export const statusColors: Record<string, { background: string; text: string; border: string }> = {
  New: { background: "bg-sky-100 dark:bg-sky-900", text: "text-sky-700 dark:text-sky-300", border: "border-sky-500" },
  Backlog: {
    background: "bg-slate-100 dark:bg-slate-700",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-500",
  },
  "To Do": {
    background: "bg-blue-100 dark:bg-blue-900",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500",
  },
  "In Progress": {
    background: "bg-amber-100 dark:bg-amber-900",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500",
  },
  "In Review": {
    background: "bg-purple-100 dark:bg-purple-900",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-500",
  },
  Done: {
    background: "bg-green-100 dark:bg-green-900",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-500",
  },
  Completed: {
    background: "bg-emerald-100 dark:bg-emerald-900",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500",
  },
  Default: {
    background: "bg-gray-100 dark:bg-gray-700",
    text: "text-gray-600 dark:text-gray-300",
    border: "border-gray-500",
  },
}

export const productAreaColors: Record<string, { background: string; text: string; border: string }> = {
  "Core Platform": {
    background: "bg-red-100 dark:bg-red-900",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-500",
  },
  "User Interface": {
    background: "bg-orange-100 dark:bg-orange-900",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-500",
  },
  API: {
    background: "bg-yellow-100 dark:bg-yellow-900",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-500",
  },
  "Mobile Initiative": {
    background: "bg-lime-100 dark:bg-lime-900",
    text: "text-lime-700 dark:text-lime-300",
    border: "border-lime-500",
  },
  "Data Analytics": {
    background: "bg-teal-100 dark:bg-teal-900",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-500",
  },
  Integrations: {
    background: "bg-cyan-100 dark:bg-cyan-900",
    text: "text-cyan-700 dark:text-cyan-300",
    border: "border-cyan-500",
  },
  Portal: {
    background: "bg-sky-100 dark:bg-sky-900",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-sky-500",
  },
  Action: {
    background: "bg-indigo-100 dark:bg-indigo-900",
    text: "text-indigo-700 dark:text-indigo-300",
    border: "border-indigo-500",
  },
  BandTogether: {
    background: "bg-fuchsia-100 dark:bg-fuchsia-900",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-fuchsia-500",
  },
  Default: {
    background: "bg-gray-100 dark:bg-gray-700",
    text: "text-gray-600 dark:text-gray-300",
    border: "border-gray-500",
  },
}

// Priority colors are already defined in staticConfig.priorities (bg-color format)
// We'll need a way to get border color from bg-color for priorities.
export const priorityBorderColors: Record<string, string> = {
  Highest: "border-red-500",
  High: "border-orange-500",
  Medium: "border-yellow-500",
  Low: "border-green-500",
  Default: "border-slate-400",
}

// NOTE: The configuration items below are static definitions for the application's UI and logic.
// For a fully dynamic system, these could be fetched from a database table (e.g., 'team_members', 'statuses').
export const staticConfig = {
  statuses: ["New", "Backlog", "To Do", "In Progress", "In Review", "Done", "Completed"],
  priorities: {
    // These are background colors
    Highest: "bg-red-500",
    High: "bg-orange-500",
    Medium: "bg-yellow-500",
    Low: "bg-green-500",
  },
  productAreas: [
    "Core Platform",
    "User Interface",
    "API",
    "Mobile Initiative",
    "Data Analytics",
    "Integrations",
    "Portal",
    "Action",
    "BandTogether",
  ],
  effortSizes: ["XS", "S", "M", "L", "XL"],
  // The list of team members is used to populate UI elements like assignees dropdowns.
  // In a production app, this would likely come from a 'users' or 'team_members' table in the database.
  teamMembers: [
    { name: "Zonaid", color: "bg-blue-500" },
    { name: "Alice", color: "bg-pink-500" },
    { name: "Bob", color: "bg-indigo-500" },
    { name: "Charlie", color: "bg-purple-500" },
    { name: "Diana", color: "bg-teal-500" },
    { name: "Eve", color: "bg-lime-500" },
    { name: "Foysal", color: "bg-sky-500" },
    { name: "Grace", color: "bg-rose-500" },
    { name: "Henry", color: "bg-amber-500" },
    { name: "Ivy", color: "bg-cyan-500" },
    { name: "Jack", color: "bg-emerald-500" },
    { name: "Sarah Chen", color: "bg-fuchsia-500" },
    { name: "Mike Johnson", color: "bg-green-600" },
    { name: "Lisa Wang", color: "bg-pink-600" },
    { name: "Mike Lee", color: "bg-violet-500" },
    { name: "Laura Palmer", color: "bg-red-400" },
  ] as TeamMember[],
  viewsEnabled: ["calendar", "kanban", "table", "timeline"],
}

// All hardcoded task data has been removed.
// The application will now fetch all tasks directly from the database.
// The `sampleTasks` array is left empty to ensure no static data is loaded on startup.
export const sampleTasks: Task[] = []
