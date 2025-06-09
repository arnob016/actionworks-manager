"use client"

import type React from "react"
import Image from "next/image" // Import Image
import {
  Calendar,
  Kanban,
  Table,
  Moon,
  Sun,
  Plus,
  Settings,
  Folder,
  ChevronsLeft,
  Filter,
  LayoutList,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { staticConfig } from "@/lib/config"
import type { ViewMode } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useTaskStore, useConfigStore } from "@/lib/store"
import { Separator } from "@/components/ui/separator"

interface SidebarProps {
  currentView: ViewMode
  setCurrentView: (view: ViewMode) => void
  darkMode: boolean
  toggleDarkMode: () => void
  handleCreateTask: () => void
  handleOpenSettings: () => void
  currentProductArea: string | null
  onProductAreaChange: (area: string | null) => void
  onToggleFilters?: () => void
  activeFilterCount?: number
}

const ProjectStatus: React.FC<{ productArea: string }> = ({ productArea }) => {
  const tasks = useTaskStore((state) => state.tasks)
  const projectTasks = tasks.filter((t) => t.productArea === productArea)
  const completedTasks = projectTasks.filter((t) => t.status === "Completed").length
  const totalTasks = projectTasks.length

  if (totalTasks === 0) {
    return <div className="w-10 h-1 bg-muted rounded-full" title="No tasks in this project" />
  }

  const percentage = Math.round((completedTasks / totalTasks) * 100)

  return (
    <div
      className="flex items-center gap-1.5 ml-auto"
      title={`${completedTasks}/${totalTasks} tasks completed (${percentage}%)`}
    >
      <span className="text-[10px] text-muted-foreground">{percentage}%</span>
      <div className="w-10 h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

export function Sidebar({
  currentView,
  setCurrentView,
  darkMode,
  toggleDarkMode,
  handleCreateTask,
  handleOpenSettings,
  currentProductArea,
  onProductAreaChange,
  onToggleFilters,
  activeFilterCount,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const config = useConfigStore()
  const productAreas = config.productAreas

  const commonButtonClass =
    "w-full justify-start text-muted-foreground hover:bg-accent hover:text-foreground text-sm h-9"
  const activeCommonButtonClass = "bg-accent text-foreground font-medium"

  const icons = {
    calendar: Calendar,
    kanban: Kanban,
    table: Table,
    timeline: LayoutList,
  }

  return (
    <aside
      className={cn(
        "bg-card border-r border-border flex flex-col transition-all duration-200 ease-in-out",
        isCollapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex items-center justify-between h-14 border-b border-border px-3">
        {!isCollapsed && (
          <div className="flex items-center space-x-2 overflow-hidden">
            <Image src="/action-logo.png" alt="Action Logo" width={28} height={28} className="flex-shrink-0" />
            <h1 className="text-md font-semibold text-foreground truncate">Action</h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-muted-foreground hover:text-foreground -ml-1 sm:ml-0"
        >
          {isCollapsed ? (
            <Image src="/action-logo.png" alt="Action Logo" width={20} height={20} />
          ) : (
            <ChevronsLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      <nav className="flex-grow px-2 py-3 space-y-1 overflow-y-auto">
        <div>
          <h3
            className={cn(
              "px-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1",
              isCollapsed && "text-center sr-only",
            )}
          >
            Views
          </h3>
          {staticConfig.viewsEnabled.map((view) => {
            const Icon = icons[view as keyof typeof icons]
            return (
              <Button
                key={view}
                variant="ghost"
                className={cn(
                  commonButtonClass,
                  currentView === view && activeCommonButtonClass,
                  isCollapsed && "justify-center px-0",
                )}
                onClick={() => setCurrentView(view as ViewMode)}
                title={isCollapsed ? view.charAt(0).toUpperCase() + view.slice(1) : ""}
              >
                <Icon className={cn("w-4 h-4", !isCollapsed && "mr-2.5")} />
                {!isCollapsed && <span className="capitalize text-xs">{view}</span>}
              </Button>
            )
          })}
        </div>

        <Separator className="my-2 bg-border/60" />

        <div>
          <h3
            className={cn(
              "px-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1 mt-2",
              isCollapsed && "text-center sr-only",
            )}
          >
            Projects
          </h3>
          <Button
            variant="ghost"
            className={cn(
              commonButtonClass,
              !currentProductArea && activeCommonButtonClass,
              isCollapsed && "justify-center px-0",
            )}
            onClick={() => onProductAreaChange(null)}
            title={isCollapsed ? "All Projects" : ""}
          >
            <Folder className={cn("w-4 h-4", !isCollapsed && "mr-2.5")} />
            {!isCollapsed && <span className="text-xs">All Projects</span>}
          </Button>
          {productAreas.map((area) => (
            <Button
              key={area}
              variant="ghost"
              className={cn(
                commonButtonClass,
                currentProductArea === area && activeCommonButtonClass,
                isCollapsed && "justify-center px-0",
              )}
              onClick={() => onProductAreaChange(area)}
              title={isCollapsed ? area : ""}
            >
              <Folder className={cn("w-4 h-4", !isCollapsed && "mr-2.5")} />
              {!isCollapsed && <span className="text-xs truncate max-w-[100px]">{area}</span>}
              {!isCollapsed && <ProjectStatus productArea={area} />}
            </Button>
          ))}
        </div>

        {onToggleFilters && (
          <div className={cn("sm:hidden mt-3 pt-2 border-t border-border", isCollapsed && "hidden")}>
            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground border-border hover:bg-accent hover:text-foreground"
              onClick={onToggleFilters}
            >
              <Filter className="w-4 h-4 mr-2.5" />
              <span className="text-xs">Filters</span>
              {activeFilterCount && activeFilterCount > 0 && (
                <span className="ml-auto bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        )}
      </nav>

      <div className="border-t border-border p-2 space-y-1.5 mt-auto">
        <Button
          size="sm"
          className={cn(
            "w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs",
            isCollapsed ? "justify-center px-0" : "justify-start",
          )}
          onClick={handleCreateTask}
          title={isCollapsed ? "New Task" : ""}
        >
          <Plus className={cn("w-4 h-4", !isCollapsed && "mr-2")} />
          {!isCollapsed && <span>New Task</span>}
        </Button>
        <div className={cn("flex", isCollapsed ? "flex-col space-y-1" : "space-x-1")}>
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            onClick={toggleDarkMode}
            className="w-full text-muted-foreground hover:text-foreground hover:bg-accent"
            title={isCollapsed ? (darkMode ? "Light Mode" : "Dark Mode") : ""}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!isCollapsed && <span className="text-xs ml-2 sm:hidden md:inline">{darkMode ? "Light" : "Dark"}</span>}
          </Button>
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            onClick={handleOpenSettings}
            className="w-full text-muted-foreground hover:text-foreground hover:bg-accent"
            title={isCollapsed ? "Settings" : ""}
          >
            <Settings className="w-4 h-4" />
            {!isCollapsed && <span className="text-xs ml-2 sm:hidden md:inline">Settings</span>}
          </Button>
        </div>
      </div>
    </aside>
  )
}
