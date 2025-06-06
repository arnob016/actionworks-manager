"use client"

import React from "react" // Import React for React.memo
import {
  Calendar,
  Clock,
  User,
  Edit,
  GripVertical,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Paperclip,
  MessageSquare,
  GitFork,
  Lock,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { priorityBorderColors } from "@/lib/config"
import type { Task } from "@/lib/types"
import { useTaskStore, useConfigStore } from "@/lib/store"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface TaskCardProps {
  task: Task
  onEditTask: (task: Task) => void
  showDragHandle?: boolean
}

function TaskCardComponent({ task, onEditTask, showDragHandle = false }: TaskCardProps) {
  const { getPriorityColorByName, getTeamMemberColorByName } = useConfigStore()
  const { toggleTaskCompletion } = useTaskStore()

  const priorityColor = getPriorityColorByName(task.priority) || "bg-slate-400"
  const priorityBorder = priorityBorderColors[task.priority] || priorityBorderColors.Default

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    } catch (e) {
      return "Invalid Date"
    }
  }

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false
    try {
      const dueDate = new Date(dateString)
      const today = new Date()
      dueDate.setHours(0, 0, 0, 0)
      today.setHours(0, 0, 0, 0)
      return dueDate < today
    } catch (e) {
      return false
    }
  }

  // Fetch all tasks once
  const allTasks = useTaskStore((state) => state.tasks)
  // Memoize subtask calculation
  const subtasks = React.useMemo(() => allTasks.filter((t) => t.parentId === task.id), [allTasks, task.id])

  return (
    <div
      className={cn(
        "bg-card rounded-lg border p-3 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group relative",
        priorityBorder,
        task.status === "Completed" && "opacity-60 dark:opacity-50",
      )}
    >
      {showDragHandle && (
        <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <div className={`flex items-start justify-between mb-2 ${showDragHandle ? "ml-2.5" : ""}`}>
        <h3
          className={cn(
            "font-semibold text-sm text-foreground leading-tight flex-1 pr-1 line-clamp-2",
            task.status === "Completed" && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </h3>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <Badge
            className={cn(
              "text-white text-[10px] px-1.5 py-0.5 font-medium",
              priorityColor,
              task.status === "Completed" ? "bg-opacity-70" : "",
            )}
          >
            {task.priority}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 data-[state=open]:opacity-100 data-[state=open]:bg-accent"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEditTask(task)
                }}
              >
                <Edit className="w-3.5 h-3.5 mr-2" /> Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  toggleTaskCompletion(task.id)
                }}
              >
                {task.status === "Completed" ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 mr-2 text-yellow-500" /> Mark as Incomplete
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-green-500" /> Mark as Completed
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {task.description && (
        <p className={`text-xs text-muted-foreground mb-2 line-clamp-2 ${showDragHandle ? "ml-2.5" : ""}`}>
          {task.description}
        </p>
      )}

      <div className={`flex items-center space-x-2 mb-2.5 ${showDragHandle ? "ml-2.5" : ""}`}>
        <User className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="flex -space-x-1">
          {task.assignees.slice(0, 3).map((assigneeName, index) => {
            const assigneeColor = getTeamMemberColorByName(assigneeName) || "bg-slate-400"
            return (
              <Avatar key={index} className="w-6 h-6 border-2 border-card">
                <AvatarFallback className={`${assigneeColor} text-white text-[9px] font-semibold`}>
                  {assigneeName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            )
          })}
          {task.assignees.length > 3 && (
            <Avatar className="w-6 h-6 border-2 border-card">
              <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-semibold">
                +{task.assignees.length - 3}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      <div className={`flex items-center justify-between text-xs ${showDragHandle ? "ml-2.5" : ""}`}>
        <div className="flex items-center space-x-2">
          <div
            className={`flex items-center space-x-1 ${
              isOverdue(task.dueDate) ? "text-destructive font-medium" : "text-muted-foreground"
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>{formatDate(task.dueDate)}</span>
          </div>
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{task.effort || "N/A"}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
          {task.productArea || "N/A"}
        </Badge>
      </div>

      {(task.attachments?.length ||
        task.comments?.length ||
        subtasks.length > 0 ||
        task.tags?.length ||
        task.isPrivate) && (
        <div
          className={`flex items-center space-x-2 text-muted-foreground mt-2 pt-2 border-t border-border/60 ${
            showDragHandle ? "ml-2.5" : ""
          }`}
        >
          {task.isPrivate && <Lock className="w-3 h-3 text-yellow-500" title="Private Task" />}
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center text-xs" title={`${task.attachments.length} attachments`}>
              <Paperclip className="w-3 h-3 mr-0.5" />
              <span>{task.attachments.length}</span>
            </div>
          )}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center text-xs" title={`${task.comments.length} comments`}>
              <MessageSquare className="w-3 h-3 mr-0.5" />
              <span>{task.comments.length}</span>
            </div>
          )}
          {subtasks.length > 0 && (
            <div className="flex items-center text-xs" title={`${subtasks.length} subtasks`}>
              <GitFork className="w-3 h-3 mr-0.5" />
              <span>{subtasks.length}</span>
            </div>
          )}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              {task.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 2 && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  +{task.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const TaskCard = React.memo(TaskCardComponent)
