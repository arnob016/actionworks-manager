"use client"

import Image from "next/image" // Import Image
import { Calendar, Kanban, Table, Moon, Sun, Plus, Settings, Folder, LayoutList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { staticConfig } from "@/lib/config"
import type { ViewMode } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface TopNavbarProps {
  currentView: ViewMode
  setCurrentView: (view: ViewMode) => void
  darkMode: boolean
  toggleDarkMode: () => void
  handleCreateTask: () => void
  handleOpenSettings: () => void
  currentProductArea: string | null
  onProductAreaChange: (area: string | null) => void
}

export function TopNavbar({
  currentView,
  setCurrentView,
  darkMode,
  toggleDarkMode,
  handleCreateTask,
  handleOpenSettings,
  currentProductArea,
  onProductAreaChange,
}: TopNavbarProps) {
  const productAreas = Array.isArray(staticConfig?.productAreas) ? staticConfig.productAreas : []
  const viewsEnabled = Array.isArray(staticConfig?.viewsEnabled) ? staticConfig.viewsEnabled : []

  return (
    <header className="bg-card/80 border-b border-border flex-shrink-0 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center space-x-3">
            <Image src="/action-logo.png" alt="Action Logo" width={28} height={28} />
            <h1 className="text-lg font-semibold text-foreground">Action</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-1.5 text-muted-foreground hover:text-foreground px-2"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{currentProductArea || "All Projects"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filter by Project</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onProductAreaChange(null)}>All Projects</DropdownMenuItem>
                {productAreas.map((area) => (
                  <DropdownMenuItem key={area} onClick={() => onProductAreaChange(area)}>
                    {area}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="hidden sm:flex items-center justify-center space-x-1 bg-muted/60 rounded-lg p-0.5">
            {viewsEnabled.map((view) => {
              const icons = { calendar: Calendar, kanban: Kanban, table: Table, timeline: LayoutList }
              const Icon = icons[view as keyof typeof icons]
              if (!Icon) return null
              return (
                <button
                  key={view}
                  onClick={() => setCurrentView(view as ViewMode)}
                  className={cn(
                    "flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    currentView === view
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" /> <span className="capitalize">{view}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center space-x-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenSettings}
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-xs h-8 text-primary-foreground"
              onClick={handleCreateTask}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Task
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
