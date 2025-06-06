"use client"

import type React from "react"
import { useState } from "react"
import { Plus, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TaskCard } from "./task-card"
import { useTaskStore, useConfigStore } from "@/lib/store"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"

interface KanbanViewProps {
  tasks: Task[]
  onEditTask: (task: Task) => void
  onCreateTaskInStatus: (status: string) => void
}

export function KanbanView({ tasks, onEditTask, onCreateTaskInStatus }: KanbanViewProps) {
  const { moveTask, reorderTaskInStatus } = useTaskStore()
  const { statuses: configStatuses } = useConfigStore()

  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dragOverTask, setDragOverTask] = useState<string | null>(null)

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", task.id)
    // Adding a class to the body can help style the drag operation globally
    document.body.classList.add("dragging-kanban-item")
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    setDragOverColumn(null)
    setDragOverTask(null)
    document.body.classList.remove("dragging-kanban-item")
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault() // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move"
    if (status !== dragOverColumn) {
      setDragOverColumn(status)
    }
  }

  const handleEnterColumn = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverColumn(status)
  }

  const handleDragLeaveColumn = (e: React.DragEvent) => {
    // Check if the mouse is leaving the column to an element outside of it
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null)
    }
  }

  const handleDragEnterTask = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event from bubbling to parent column
    if (draggedTask && draggedTask.id !== targetTaskId) {
      setDragOverTask(targetTaskId)
    }
  }

  const handleDragLeaveTask = (e: React.DragEvent) => {
    e.stopPropagation()
    // Check if the mouse is leaving the task to an element outside of it
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTask(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event from bubbling to parent elements
    if (!draggedTask) return

    if (dragOverTask && dragOverTask !== draggedTask.id) {
      // Dropping onto another task (reordering)
      const tasksInStatus = getTasksByStatus(targetStatus)
      const targetTaskInstance = tasksInStatus.find((t) => t.id === dragOverTask)
      if (targetTaskInstance) {
        if (draggedTask.status === targetStatus) {
          // Reordering within the same status
          reorderTaskInStatus(draggedTask.id, draggedTask.order!, targetTaskInstance.order!, targetStatus)
        } else {
          // Moving to a new status and reordering
          moveTask(draggedTask.id, targetStatus, targetTaskInstance.order)
        }
      }
    } else if (dragOverColumn) {
      // Dropping onto a column (not a specific task)
      if (draggedTask.status !== targetStatus) {
        const tasksInTargetStatus = getTasksByStatus(targetStatus)
        const newOrder =
          tasksInTargetStatus.length > 0 ? Math.max(...tasksInTargetStatus.map((t) => t.order || 0)) + 1 : 0
        moveTask(draggedTask.id, targetStatus, newOrder)
      }
    }
    handleDragEnd()
  }

  const totalTasksCount = tasks.length

  return (
    <div className="flex-grow p-1 sm:p-2 md:p-3">
      {totalTasksCount === 0 && !draggedTask && (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Inbox className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-500" />
          <h3 className="text-xl font-semibold mb-1">No Tasks Yet</h3>
          <p className="text-sm mb-4">Get started by creating a new task in any column.</p>
          <p className="text-xs">You can also adjust filters if you expect to see tasks.</p>
        </div>
      )}
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 h-full",
          totalTasksCount === 0 && "hidden", // Hide grid if no tasks and not dragging
        )}
      >
        {configStatuses.map((statusConfig) => {
          const statusTasks = getTasksByStatus(statusConfig.name)
          const isColumnDragOver = dragOverColumn === statusConfig.name && !dragOverTask
          const isWipExceeded =
            statusConfig.wipLimit !== null &&
            statusConfig.wipLimit !== undefined &&
            statusTasks.length > statusConfig.wipLimit

          return (
            <div
              key={statusConfig.name}
              onDragOver={(e) => handleDragOver(e, statusConfig.name)}
              onDragEnter={(e) => handleEnterColumn(e, statusConfig.name)}
              onDragLeave={handleDragLeaveColumn}
              onDrop={(e) => handleDrop(e, statusConfig.name)}
              className={cn(
                "rounded-xl bg-background flex flex-col border transition-all duration-200 ease-in-out",
                isColumnDragOver ? "bg-primary/5 border-primary/30 shadow-lg" : "shadow-sm",
                isWipExceeded ? "border-destructive/50" : "border-border",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-between p-3 sm:p-4 border-b flex-shrink-0 transition-colors",
                  isWipExceeded ? "bg-destructive/10 border-destructive/50" : "border-border",
                )}
              >
                <div className="flex items-center space-x-2">
                  <h3 className={cn("font-semibold text-sm", isWipExceeded ? "text-destructive" : "text-foreground")}>
                    {statusConfig.name}
                  </h3>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      isWipExceeded ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {statusTasks.length}
                    {statusConfig.wipLimit !== null &&
                      statusConfig.wipLimit !== undefined &&
                      ` / ${statusConfig.wipLimit}`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                  aria-label={`Add task to ${statusConfig.name}`}
                  onClick={() => onCreateTaskInStatus(statusConfig.name)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-grow p-2 sm:p-3 space-y-3 overflow-y-auto min-h-[200px]">
                {statusTasks.map((task) => (
                  <div
                    key={task.id}
                    data-task-id={task.id} // Useful for debugging or e2e tests
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onDragEnter={(e) => handleDragEnterTask(e, task.id)}
                    onDragLeave={handleDragLeaveTask}
                    className={cn(
                      "cursor-grab group relative transition-all duration-150 ease-in-out",
                      draggedTask?.id === task.id && "opacity-30 scale-[0.98] shadow-2xl", // Style for the task being dragged
                      dragOverTask === task.id &&
                        draggedTask?.id !== task.id &&
                        "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg", // Style for task being hovered over by another task
                    )}
                  >
                    {/* Visual cue for drop position when hovering over a task */}
                    {dragOverTask === task.id && draggedTask?.id !== task.id && (
                      <div className="absolute -top-1.5 left-0 right-0 h-1 bg-primary rounded-full z-10" />
                    )}
                    <TaskCard task={task} onEditTask={onEditTask} showDragHandle />
                  </div>
                ))}
                {statusTasks.length === 0 && !isColumnDragOver && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No tasks in {statusConfig.name}.<br />
                    Drag tasks here or click '+' to add.
                  </div>
                )}
                {/* Visual cue for dropping into an empty column or at the end */}
                {isColumnDragOver && (
                  <div className="h-20 border-2 border-dashed border-primary/50 rounded-lg flex items-center justify-center text-primary/70 text-sm bg-primary/5">
                    Drop here to add to {statusConfig.name}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
