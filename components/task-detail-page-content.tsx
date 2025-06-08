"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Calendar,
  User,
  Users,
  Flag,
  Zap,
  BarChart3,
  Building,
  Tag,
  Paperclip,
  MessageSquare,
  GitFork,
  CheckCircle2,
  XCircle,
  LinkIcon as LinkIconLucide,
  Clock,
  Copy,
  FileText,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Task, Comment as CommentType } from "@/lib/types"
import { useConfigStore, useTaskStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface TaskDetailPageContentProps {
  task: Task
}

export function TaskDetailPageContent({ task }: TaskDetailPageContentProps) {
  const router = useRouter()
  const {
    getTeamMemberColorByName,
    getPriorityColorByName,
    statuses,
    // priorities, // Not directly used, color is fetched
    teamMembers,
    // productAreas, // Not directly used
    // effortSizes, // Not directly used
  } = useConfigStore()
  const { tasks: allTasks, toggleTaskCompletion } = useTaskStore()

  const formatDate = (dateString: string | null, includeTime = false) => {
    if (!dateString) return "N/A"
    try {
      const date = parseISO(dateString)
      return format(date, includeTime ? "MMM d, yyyy 'at' h:mm a" : "MMM d, yyyy")
    } catch (e) {
      return "Invalid Date"
    }
  }

  const handleCopy = (textToCopy: string, type: string) => {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => toast.success(`${type} copied to clipboard!`))
      .catch(() => toast.error(`Failed to copy ${type}.`))
  }

  const subtasks = allTasks.filter((t) => t.parentId === task.id)
  const dependencies = allTasks.filter((t) => task.dependsOn?.includes(t.id))
  const dependentTasks = allTasks.filter((t) => t.dependsOn?.includes(task.id))

  const priorityColor = getPriorityColorByName(task.priority)
  const reporterInfo = teamMembers.find((tm) => tm.name === task.reporter)
  const assigneesInfo = task.assignees
    .map((name) => teamMembers.find((tm) => tm.name === name))
    .filter(Boolean) as typeof teamMembers

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Task Details Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-2xl font-bold text-foreground">{task.title}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleTaskCompletion(task.id)}
                className={cn(
                  "ml-4 text-xs",
                  task.status === "Completed"
                    ? "border-green-500 text-green-500 hover:bg-green-500/10"
                    : "border-yellow-500 text-yellow-500 hover:bg-yellow-500/10",
                )}
              >
                {task.status === "Completed" ? (
                  <>
                    <XCircle className="mr-1.5 h-3.5 w-3.5" /> Mark Incomplete
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark Completed
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                ID: {task.id.substring(0, 8)}...
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                onClick={() => handleCopy(task.id, "Task ID")}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {task.description ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            ) : (
              <p className="text-muted-foreground italic">No description provided.</p>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            {[
              {
                label: "Status",
                value: task.status,
                icon: Flag,
                color: statuses.find((s) => s.name === task.status)?.color, // Assuming color on StatusConfig
              },
              { label: "Priority", value: task.priority, icon: Zap, color: priorityColor },
              { label: "Project", value: task.productArea || "N/A", icon: Building },
              { label: "Effort", value: task.effort || "N/A", icon: BarChart3 },
              { label: "Start Date", value: formatDate(task.startDate), icon: Calendar },
              { label: "Due Date", value: formatDate(task.dueDate), icon: Calendar },
              { label: "Created At", value: formatDate(task.createdAt, true), icon: Clock },
              { label: "Last Updated", value: formatDate(task.updatedAt, true), icon: Clock },
            ].map((item) => (
              <div key={item.label} className="flex items-start">
                <item.icon className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <span className="font-medium text-muted-foreground">{item.label}: </span>
                  {item.color ? (
                    <Badge style={{ backgroundColor: item.color }} className="text-white text-xs px-1.5 py-0.5">
                      {item.value}
                    </Badge>
                  ) : (
                    <span className="text-foreground">{item.value}</span>
                  )}
                </div>
              </div>
            ))}
            <div className="flex items-start md:col-span-2">
              <Users className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <span className="font-medium text-muted-foreground">Assignees: </span>
                {assigneesInfo.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {assigneesInfo.map((assignee) => (
                      <Badge
                        key={assignee.name}
                        variant="secondary"
                        style={{ backgroundColor: assignee.color }}
                        className="text-white text-xs px-1.5 py-0.5"
                      >
                        {assignee.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-foreground">None</span>
                )}
              </div>
            </div>
            <div className="flex items-start">
              <User className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div>
                <span className="font-medium text-muted-foreground">Reporter: </span>
                {reporterInfo ? (
                  <Badge
                    variant="secondary"
                    style={{ backgroundColor: reporterInfo.color }}
                    className="text-white text-xs px-1.5 py-0.5"
                  >
                    {reporterInfo.name}
                  </Badge>
                ) : (
                  <span className="text-foreground">{task.reporter || "N/A"}</span>
                )}
              </div>
            </div>
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-start md:col-span-2">
                <Tag className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div>
                  <span className="font-medium text-muted-foreground">Tags: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleCopy(tag, "Tag")}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {(dependencies.length > 0 || dependentTasks.length > 0) && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Task Relationships</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dependencies.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center">
                      <LinkIconLucide className="w-4 h-4 mr-1.5 text-muted-foreground" />
                      Prerequisites (Blocks this task):
                    </h4>
                    <ul className="space-y-1.5">
                      {dependencies.map((dep) => (
                        <li
                          key={dep.id}
                          className="text-sm flex items-center justify-between p-2 bg-muted/30 rounded-md"
                        >
                          <Link
                            href={`/task/${dep.id}`}
                            className="text-primary hover:underline truncate"
                            title={dep.title}
                          >
                            {dep.title}
                          </Link>
                          <Badge variant="outline" className="ml-2 text-xs flex-shrink-0">
                            {dep.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {dependentTasks.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center">
                      <GitFork className="w-4 h-4 mr-1.5 text-muted-foreground" />
                      Dependent Tasks (Blocked by this task):
                    </h4>
                    <ul className="space-y-1.5">
                      {dependentTasks.map((depTask) => (
                        <li
                          key={depTask.id}
                          className="text-sm flex items-center justify-between p-2 bg-muted/30 rounded-md"
                        >
                          <Link
                            href={`/task/${depTask.id}`}
                            className="text-primary hover:underline truncate"
                            title={depTask.title}
                          >
                            {depTask.title}
                          </Link>
                          <Badge variant="outline" className="ml-2 text-xs flex-shrink-0">
                            {depTask.status}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
            <Separator />
          </>
        )}
      </div>

      {/* Sidebar Column for Subtasks, Comments, Attachments */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <GitFork className="w-5 h-5 mr-2 text-muted-foreground" />
              Subtasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subtasks.length > 0 ? (
              <ul className="space-y-2">
                {subtasks.map((sub) => (
                  <li key={sub.id} className="text-sm p-2.5 bg-muted/50 rounded-md hover:bg-accent transition-colors">
                    <Link href={`/task/${sub.id}`} className="block">
                      <div className="flex justify-between items-center">
                        <span
                          className={cn("truncate", sub.status === "Completed" && "line-through text-muted-foreground")}
                        >
                          {sub.title}
                        </span>
                        <Badge
                          variant={sub.status === "Completed" ? "default" : "secondary"}
                          className="text-xs flex-shrink-0"
                        >
                          {sub.status}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-4">No subtasks.</p>
            )}
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-muted-foreground" />
              Comments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {task.comments && task.comments.length > 0 ? (
              <ScrollArea className="h-[250px] pr-3 -mr-3">
                <ul className="space-y-4">
                  {task.comments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((comment: CommentType) => (
                      <li key={comment.id} className="text-sm border-b border-border pb-3 last:border-b-0">
                        <div className="flex items-center mb-1.5">
                          <Avatar className="w-7 h-7 mr-2.5">
                            <AvatarFallback
                              className={`${getTeamMemberColorByName(comment.author)} text-white text-[10px]`}
                            >
                              {comment.author
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-foreground">{comment.author}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDate(comment.createdAt, true)}
                          </span>
                        </div>
                        <p className="text-foreground/90 whitespace-pre-wrap text-xs pl-[calc(1.75rem+0.625rem)]">
                          {comment.content}
                        </p>{" "}
                        {/* 28px + 10px */}
                      </li>
                    ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-4">No comments yet.</p>
            )}
            {/* Future: Add comment input here */}
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Paperclip className="w-5 h-5 mr-2 text-muted-foreground" />
              Attachments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {task.attachments && task.attachments.length > 0 ? (
              <ul className="space-y-2">
                {task.attachments.map((att) => (
                  <li key={att.id} className="text-sm flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate flex items-center"
                      title={att.fileName}
                    >
                      <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{att.fileName}</span>
                    </a>
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">({att.fileType})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-4">No attachments.</p>
            )}
            {/* Future: Add attachment upload here */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
