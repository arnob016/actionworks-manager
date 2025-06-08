"use client"

import type React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import { Search, FilterIcon as FilterIconLucide, User, Briefcase, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CalendarView } from "./calendar-view"
import { KanbanView } from "./kanban-view"
import { TableView } from "./table-view"
import { TimelineView } from "./timeline-view"
import { TaskFilters } from "./task-filters"
import { TaskModal } from "./task-modal"
import { SettingsModal } from "./settings-modal"
import { TopNavbar } from "./top-navbar"
import { Sidebar } from "./sidebar"
import { useTaskStore, useUserPreferencesStore, useConfigStore } from "@/lib/store"
import type { ViewMode, Task, TaskFormData } from "@/lib/types"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// Add AiChatWidget import
import { AiChatWidget } from "./ai-chat-widget"

const CURRENT_USER = "Zonaid" // This should ideally come from an auth system

export function TaskManagementApp() {
  // Use granular selectors for Zustand state
  const storedViewModeFromPrefs = useUserPreferencesStore((state) => state.preferences.viewMode)
  const isDarkMode = useUserPreferencesStore((state) => state.preferences.darkMode)
  const setPreferences = useUserPreferencesStore((state) => state.setPreferences)
  const preferencesLayout = useUserPreferencesStore((state) => state.preferences.layout) // For layout rendering

  const { tasks, isLoading, fetchTasks } = useTaskStore()
  const { teamMembers, productAreas } = useConfigStore()

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Derive the `currentView` on every render from the single source of truth (storedViewModeFromPrefs).
  // This ensures we always use a valid view, even if the stored one is corrupted.
  const currentView = useMemo(() => {
    const validViews: ViewMode[] = ["calendar", "kanban", "table", "timeline"]
    return validViews.includes(storedViewModeFromPrefs) ? storedViewModeFromPrefs : "kanban"
  }, [storedViewModeFromPrefs])

  // Use an effect ONLY to correct an invalid value in the store.
  // This runs if the derived `currentView` (the safe value) is different from what's in the store.
  useEffect(() => {
    if (currentView !== storedViewModeFromPrefs) {
      setPreferences({ viewMode: currentView })
    }
  }, [currentView, storedViewModeFromPrefs, setPreferences])

  // The update function from the UI now only has one job: update the store.
  const updateCurrentView = useCallback(
    (newView: ViewMode) => {
      // Conditional check prevents unnecessary store updates if the view is already correct.
      if (storedViewModeFromPrefs !== newView) {
        setPreferences({ viewMode: newView })
      }
    },
    [storedViewModeFromPrefs, setPreferences],
  )

  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formDataForModalCreation, setFormDataForModalCreation] = useState<Partial<TaskFormData> | null>(null)
  const [currentProductAreaFilter, setCurrentProductAreaFilter] = useState<string | null>(null)
  const [selectedTimelineAssignee, setSelectedTimelineAssignee] = useState<string | null>(null)
  const [selectedTimelineProject, setSelectedTimelineProject] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode)
  }, [isDarkMode])

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    assignee: "",
    productArea: currentProductAreaFilter || "",
  })

  useEffect(() => {
    setFilters((prev) => ({ ...prev, productArea: currentProductAreaFilter || "" }))
  }, [currentProductAreaFilter])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (task.isPrivate && task.reporter !== CURRENT_USER && !task.assignees.includes(CURRENT_USER)) {
        return false
      }
      const searchLower = debouncedSearchQuery.toLowerCase()
      const matchesSearch =
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower)) ||
        task.id.toLowerCase().includes(searchLower)

      const matchesFilters =
        (!filters.status || task.status === filters.status) &&
        (!filters.priority || task.priority === filters.priority) &&
        (!filters.assignee || task.assignees.includes(filters.assignee)) &&
        (!filters.productArea || task.productArea === filters.productArea)

      return matchesSearch && matchesFilters
    })
  }, [tasks, debouncedSearchQuery, filters])

  const toggleDarkMode = useCallback(() => {
    setPreferences({ darkMode: !isDarkMode })
  }, [setPreferences, isDarkMode])

  const handleCreateTask = useCallback(
    (parentId?: string, defaultValues?: Partial<TaskFormData>) => {
      setEditingTask(null)
      const combinedDefaults: Partial<TaskFormData> = { ...defaultValues }
      if (parentId) combinedDefaults.parentId = parentId
      if (currentView === "timeline" && selectedTimelineAssignee && !combinedDefaults.assignees) {
        combinedDefaults.assignees = [selectedTimelineAssignee]
      }
      setFormDataForModalCreation(combinedDefaults)
      setShowTaskModal(true)
    },
    [currentView, selectedTimelineAssignee],
  )

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task)
    setFormDataForModalCreation(null)
    setShowTaskModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowTaskModal(false)
    setEditingTask(null)
    setFormDataForModalCreation(null)
  }, [])

  const handleCreateTaskForDate = useCallback(
    (date: Date) => {
      handleCreateTask(undefined, { startDate: format(date, "yyyy-MM-dd"), dueDate: format(date, "yyyy-MM-dd") })
    },
    [handleCreateTask],
  )

  const handleCreateTaskForDateAssignee = useCallback(
    (date: Date, assigneeName: string) => {
      handleCreateTask(undefined, {
        startDate: format(date, "yyyy-MM-dd"),
        dueDate: format(date, "yyyy-MM-dd"),
        assignees: [assigneeName],
      })
    },
    [handleCreateTask],
  )

  const handleCreateTaskInStatus = useCallback(
    (status: string) => {
      handleCreateTask(undefined, { status })
    },
    [handleCreateTask],
  )

  const viewComponents: Record<ViewMode, React.FC<any>> = {
    calendar: (props) => <CalendarView {...props} onCreateTaskForDate={handleCreateTaskForDate} />,
    kanban: (props) => <KanbanView {...props} onCreateTaskInStatus={handleCreateTaskInStatus} />,
    table: TableView,
    timeline: (props) => (
      <TimelineView
        {...props}
        onCreateTaskForDateAssignee={handleCreateTaskForDateAssignee}
        selectedAssigneeFilter={selectedTimelineAssignee}
        selectedProjectFilter={selectedTimelineProject}
      />
    ),
  }
  const CurrentViewComponent = viewComponents[currentView]

  const activeSubFilterCount = [filters.status, filters.priority, filters.assignee].filter(Boolean).length
  const totalActiveFilterCount = activeSubFilterCount + (currentProductAreaFilter ? 1 : 0)

  const navProps = {
    currentView,
    setCurrentView: updateCurrentView,
    darkMode: isDarkMode,
    toggleDarkMode,
    handleCreateTask: () => handleCreateTask(),
    handleOpenSettings: () => setShowSettingsModal(true),
    currentProductArea: currentProductAreaFilter,
    onProductAreaChange: setCurrentProductAreaFilter,
    onToggleFilters: () => setShowFilters((prev) => !prev),
    activeFilterCount: totalActiveFilterCount,
  }

  return (
    <div className={cn("h-screen w-screen overflow-hidden flex bg-background text-foreground")}>
      {preferencesLayout === "sidebar" && <Sidebar {...navProps} />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {preferencesLayout === "navbar" && <TopNavbar {...navProps} />}
        <div
          className={cn(
            "bg-card/80 border-b border-border flex-shrink-0 backdrop-blur-sm",
            preferencesLayout === "sidebar" && "sm:block",
            preferencesLayout === "navbar" && "block",
          )}
        >
          <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 py-2.5">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex-grow md:flex-1 md:max-w-xs w-full">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search tasks by title, description, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2 self-start md:self-center",
                  preferencesLayout === "sidebar" && "hidden sm:flex",
                )}
              >
                {currentView === "timeline" && (
                  <>
                    <Select
                      value={selectedTimelineAssignee || "all"}
                      onValueChange={(value) => setSelectedTimelineAssignee(value === "all" ? null : value)}
                    >
                      <SelectTrigger className="h-9 text-xs w-auto min-w-[120px]">
                        <div className="flex items-center">
                          <User className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                          <SelectValue placeholder="Assignee" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assignees</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.name} value={member.name}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedTimelineProject || "all"}
                      onValueChange={(value) => setSelectedTimelineProject(value === "all" ? null : value)}
                    >
                      <SelectTrigger className="h-9 text-xs w-auto min-w-[120px]">
                        <div className="flex items-center">
                          <Briefcase className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                          <SelectValue placeholder="Project" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {productAreas.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-1.5 text-xs h-9"
                >
                  <FilterIconLucide className="w-3.5 h-3.5" /> <span>Filters</span>
                  {totalActiveFilterCount > 0 && (
                    <Badge variant="default" className="ml-1.5 text-xs">
                      {totalActiveFilterCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
            {showFilters && (
              <div className="mt-2.5">
                <TaskFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  currentProductArea={currentProductAreaFilter}
                  onProductAreaChange={setCurrentProductAreaFilter}
                />
              </div>
            )}
          </div>
        </div>
        <main className="flex-grow overflow-auto max-w-full w-full mx-auto px-0 sm:px-1 py-1 sm:py-2 flex flex-col">
          {isLoading ? (
            <div className="flex-grow flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="ml-2 text-muted-foreground">Loading tasks...</p>
            </div>
          ) : (
            CurrentViewComponent && (
              <CurrentViewComponent
                tasks={filteredTasks}
                onEditTask={handleEditTask}
                {...(currentView === "kanban" && { onCreateTaskInStatus: handleCreateTaskInStatus })}
              />
            )
          )}
        </main>
      </div>
      {/* Add the AiChatWidget here, so it's overlaid on the app */}
      <AiChatWidget />
      <TaskModal
        isOpen={showTaskModal}
        onClose={handleCloseModal}
        task={editingTask}
        defaultInitialValues={formDataForModalCreation}
        onTriggerCreateTask={handleCreateTask}
        onTriggerEditTask={handleEditTask}
      />
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </div>
  )
}
