"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import {
  X,
  Calendar,
  User,
  Users,
  Flag,
  Zap,
  BarChart3,
  Building,
  Link2,
  Tag,
  Paperclip,
  MessageSquare,
  GitFork,
  Trash2,
  Plus,
  Send,
  Link2Off,
  AlertCircle,
  UploadCloud,
  FileText,
  Check,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Switch } from "@/components/ui/switch" // Removed
import { useTaskStore, useConfigStore, useUserPreferencesStore } from "@/lib/store"
import type { Task, TaskFormData, Comment } from "@/lib/types"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task?: Task | null
  defaultDate?: string
  defaultInitialValues?: Partial<TaskFormData>
  onTriggerCreateTask?: (parentId?: string, defaultValues?: Partial<TaskFormData>) => void
  onTriggerEditTask?: (task: Task) => void
}

const TagInput: React.FC<{
  tags: string[]
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
}> = ({ tags, onAddTag, onRemoveTag }) => {
  const [inputValue, setInputValue] = useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      if (inputValue.trim() && !tags.includes(inputValue.trim())) {
        onAddTag(inputValue.trim())
        setInputValue("")
      } else if (tags.includes(inputValue.trim())) {
        toast.info(`Tag "${inputValue.trim()}" already added.`)
      }
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {(tags || []).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
            <button type="button" onClick={() => onRemoveTag(tag)} className="ml-1.5 hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a tag and press Enter..."
        className="text-xs h-8"
      />
    </div>
  )
}

export function TaskModal({
  isOpen,
  onClose,
  task,
  defaultDate,
  defaultInitialValues,
  onTriggerCreateTask,
  onTriggerEditTask,
}: TaskModalProps) {
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    addCommentToTask,
    addTagToTask,
    removeTagFromTask,
    addDependency,
    removeDependency,
    addAttachmentToTask: storeAddAttachment,
  } = useTaskStore()

  const {
    statuses: configStatuses,
    priorities: configPriorities,
    productAreas: configProductAreas,
    effortSizes: configEffortSizes,
    teamMembers,
    getTeamMemberColorByName,
    getPriorityColorByName,
  } = useConfigStore()

  const { preferences } = useUserPreferencesStore()

  const CURRENT_USER = "Zonaid"

  const getInitialFormData = (): TaskFormData => {
    const today = new Date().toISOString().split("T")[0]
    return {
      title: defaultInitialValues?.title || "",
      description: defaultInitialValues?.description || "",
      status: defaultInitialValues?.status || configStatuses[0]?.name || "New",
      priority: defaultInitialValues?.priority || configPriorities[0]?.name || "Medium",
      assignees: defaultInitialValues?.assignees || [],
      startDate: defaultInitialValues?.startDate || defaultDate || today,
      dueDate: defaultInitialValues?.dueDate || defaultDate || today,
      effort: defaultInitialValues?.effort || configEffortSizes[0] || "M",
      productArea: defaultInitialValues?.productArea || configProductAreas[0] || "",
      dependsOn: defaultInitialValues?.dependsOn || [],
      reporter:
        defaultInitialValues?.reporter ||
        teamMembers.find((tm) => tm.name === CURRENT_USER)?.name ||
        teamMembers[0]?.name ||
        CURRENT_USER,
      tags: defaultInitialValues?.tags || [],
      // isPrivate: defaultInitialValues?.isPrivate || false, // Removed
      parentId: defaultInitialValues?.parentId,
    }
  }

  const [formData, setFormData] = useState<TaskFormData>(getInitialFormData())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("discussion")
  const [filesToUpload, setFilesToUpload] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCommentAuthor, setSelectedCommentAuthor] = useState<string>(
    teamMembers.find((tm) => tm.name === CURRENT_USER)?.name || teamMembers[0]?.name || CURRENT_USER,
  )

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setFormData({
          title: task.title || "",
          description: task.description || "",
          status: task.status || configStatuses[0]?.name || "New",
          priority: task.priority || configPriorities[0]?.name || "Medium",
          assignees: task.assignees || [],
          startDate: task.startDate || new Date().toISOString().split("T")[0],
          dueDate: task.dueDate || new Date().toISOString().split("T")[0],
          effort: task.effort || configEffortSizes[0] || "M",
          productArea: task.productArea || configProductAreas[0] || "",
          dependsOn: task.dependsOn || [],
          reporter: task.reporter || CURRENT_USER,
          tags: task.tags || [],
          // isPrivate: task.isPrivate || false, // Removed
          parentId: task.parentId,
        })
      } else {
        setFormData(getInitialFormData())
        setTimeout(() => titleInputRef.current?.focus(), 50)
      }
      const defaultAuthor =
        teamMembers.find((tm) => tm.name === CURRENT_USER)?.name || teamMembers[0]?.name || CURRENT_USER
      setSelectedCommentAuthor(defaultAuthor)

      setActiveTab("discussion")
      setFilesToUpload([])
      setIsSubmitting(false)
    }
  }, [
    task,
    isOpen,
    defaultDate,
    defaultInitialValues,
    configStatuses,
    configPriorities,
    configProductAreas,
    configEffortSizes,
    teamMembers,
  ])

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault()

    if (!formData.title.trim()) {
      toast.error("Task title cannot be empty.")
      titleInputRef.current?.focus()
      return
    }
    if (formData.startDate && formData.dueDate && new Date(formData.startDate) > new Date(formData.dueDate)) {
      toast.error("Start date cannot be after end date.")
      return
    }

    setIsSubmitting(true)
    try {
      const taskDataToSave = { ...formData }

      if (task) {
        await updateTask(task.id, taskDataToSave)
        filesToUpload.forEach((file) => {
          storeAddAttachment(task.id, {
            fileName: file.name,
            fileType: file.type,
            url: URL.createObjectURL(file), // Note: This URL is temporary
          })
        })
      } else {
        const newTaskResult = await addTask(taskDataToSave)
        if (newTaskResult && filesToUpload.length > 0) {
          filesToUpload.forEach((file) => {
            storeAddAttachment(newTaskResult.id, {
              // Use newTaskResult.id
              fileName: file.name,
              fileType: file.type,
              url: URL.createObjectURL(file),
            })
          })
        } else if (!newTaskResult && filesToUpload.length > 0) {
          toast.warn("Task created, but files could not be attached immediately. Please edit the task to add files.")
        }
      }
      onClose()
    } catch (error) {
      toast.error("An error occurred while saving the task. Please try again.")
      console.error("Error submitting task:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDescriptionKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault()
      await handleSubmit(event)
    }
  }

  const handleCommentKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (newComment.trim() && task) {
        handlePostComment()
      }
    }
  }

  const handleDeleteConfirm = async () => {
    if (task) {
      await deleteTask(task.id)
      onClose()
    }
    setShowDeleteConfirm(false)
  }

  const handlePostComment = () => {
    if (task && newComment.trim() && selectedCommentAuthor) {
      addCommentToTask(task.id, {
        author: selectedCommentAuthor,
        content: newComment.trim(),
        parentId: replyingTo || undefined,
      })
      setNewComment("")
      setReplyingTo(null)
    } else if (!selectedCommentAuthor) {
      toast.error("Please select a commenter.")
    }
  }

  const subtasks = useMemo(() => (task ? tasks.filter((t) => t.parentId === task.id) : []), [tasks, task])

  const handleAddSubtask = () => {
    if (task && onTriggerCreateTask) {
      onClose()
      onTriggerCreateTask(task.id, { productArea: task.productArea })
    } else if (!task) {
      toast.info("Please save the current task before adding subtasks.")
    }
  }

  const handleEditSubtask = (subtask: Task) => {
    if (onTriggerEditTask) {
      onClose()
      onTriggerEditTask(subtask)
    }
  }

  const isCircularDependency = (currentTaskId: string, potentialDependencyId: string, allTasks: Task[]): boolean => {
    const path = new Set<string>()
    function check(taskId: string): boolean {
      if (taskId === currentTaskId) return true
      if (path.has(taskId)) return false
      path.add(taskId)
      const taskNode = allTasks.find((t) => t.id === taskId)
      if (!taskNode || !taskNode.dependsOn || taskNode.dependsOn.length === 0) {
        path.delete(taskId)
        return false
      }
      for (const depId of taskNode.dependsOn) {
        if (check(depId)) return true
      }
      path.delete(taskId)
      return false
    }
    return check(potentialDependencyId)
  }

  const handleToggleDependency = async (dependencyId: string) => {
    if (!task) {
      toast.warn("Save the task first to manage dependencies.")
      return
    }
    const currentDependencies = formData.dependsOn || []
    if (currentDependencies.includes(dependencyId)) {
      await removeDependency(task.id, dependencyId)
    } else {
      if (isCircularDependency(task.id, dependencyId, tasks)) {
        toast.error("Circular dependency detected! Cannot add this prerequisite.")
        return
      }
      await addDependency(task.id, dependencyId)
    }
  }

  const handleAddTagWrapper = async (tag: string) => {
    if (task) await addTagToTask(task.id, tag)
    setFormData((prev) => ({ ...prev, tags: Array.from(new Set([...(prev.tags || []), tag])) }))
  }

  const handleRemoveTagWrapper = async (tag: string) => {
    if (task) await removeTagFromTask(task.id, tag)
    setFormData((prev) => ({ ...prev, tags: (prev.tags || []).filter((t) => t !== tag) }))
  }

  const availableTasksForDependencies = useMemo(() => {
    if (!task) return []
    return tasks.filter(
      (t) =>
        t.id !== task.id &&
        t.parentId !== task.id &&
        task.parentId !== t.id &&
        !(formData.dependsOn || []).includes(t.id),
    )
  }, [tasks, task, formData.dependsOn])

  const prerequisiteTasks = useMemo(() => {
    if (!task || !formData.dependsOn) return []
    return tasks.filter((t) => (formData.dependsOn || []).includes(t.id))
  }, [tasks, task, formData.dependsOn])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFilesToUpload((prevFiles) => [...prevFiles, ...Array.from(event.target.files!)])
    }
  }

  const removeFileToUpload = (fileName: string) => {
    setFilesToUpload((prevFiles) => prevFiles.filter((file) => file.name !== fileName))
  }

  const renderComment = (comment: Comment, allComments: Comment[], level = 0) => {
    const replies = allComments.filter((c) => c.parentId === comment.id)
    const authorColor = getTeamMemberColorByName(comment.author) || "bg-gray-400"
    return (
      <div key={comment.id} className={cn("py-2.5", level > 0 && "pl-4 border-l border-border ml-4")}>
        <div className="flex items-start space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className={`${authorColor} text-white text-xs`}>
              {comment.author
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-baseline space-x-2">
              <p className="font-semibold text-sm text-foreground">{comment.author}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </p>
            </div>
            <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-1 text-muted-foreground hover:text-primary mt-1"
              onClick={() => {
                setNewComment(`@${comment.author} `)
                setReplyingTo(comment.id)
              }}
            >
              Reply
            </Button>
          </div>
        </div>
        {replies.map((reply) => renderComment(reply, allComments, level + 1))}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col bg-card text-card-foreground">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center">
              {task ? "Edit Task" : "Create New Task"}
              {formData.parentId && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Subtask of {tasks.find((t) => t.id === formData.parentId)?.title || "Parent"}
                </Badge>
              )}
            </span>
            {task && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-grow flex flex-col md:flex-row overflow-hidden gap-4 md:gap-6 pt-4">
          <ScrollArea className="w-full md:w-1/2 md:pr-3">
            <form id="task-form" onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="title"
                ref={titleInputRef}
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
                placeholder="Task Title"
                className="text-lg font-semibold h-11"
              />
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={5}
                placeholder="Add a description..."
                onKeyDown={handleDescriptionKeyDown}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {[
                  { label: "Accountable", icon: User, field: "reporter", options: teamMembers.map((m) => m.name) },
                  { label: "Status", icon: Flag, field: "status", options: configStatuses.map((s) => s.name) },
                  { label: "Priority", icon: Zap, field: "priority", options: configPriorities.map((p) => p.name) },
                  { label: "Product Area", icon: Building, field: "productArea", options: configProductAreas },
                  { label: "Effort", icon: BarChart3, field: "effort", options: configEffortSizes },
                ].map((item) => (
                  <div key={item.field} className="space-y-1.5">
                    <Label className="flex items-center text-muted-foreground">
                      <item.icon className="w-3.5 h-3.5 mr-1.5" /> {item.label}
                    </Label>
                    <Select
                      value={(formData[item.field as keyof TaskFormData] as string) || ""}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, [item.field]: value }))}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {item.options.map((opt) => (
                          <SelectItem key={opt} value={opt} className="text-xs">
                            {item.field === "reporter" ? (
                              <div className="flex items-center">
                                <Avatar className="w-5 h-5 mr-2">
                                  <AvatarFallback className={`${getTeamMemberColorByName(opt)} text-white text-[9px]`}>
                                    {opt
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                {opt}
                              </div>
                            ) : item.field === "priority" ? (
                              <div className="flex items-center">
                                <div className={`w-2.5 h-2.5 rounded-full mr-2 ${getPriorityColorByName(opt)}`} />
                                {opt}
                              </div>
                            ) : (
                              opt
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="flex items-center text-muted-foreground">
                    <Users className="w-3.5 h-3.5 mr-1.5" /> Assignees
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-9 text-xs font-normal"
                      >
                        <span className="truncate">
                          {formData.assignees.length > 0 ? formData.assignees.join(", ") : "Select assignees..."}
                        </span>
                        <Users className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search team members..." className="h-9 text-xs" />
                        <CommandList>
                          <CommandEmpty>No team members found.</CommandEmpty>
                          <CommandGroup>
                            <ScrollArea className="max-h-48">
                              {teamMembers.map((member) => (
                                <CommandItem
                                  key={member.name}
                                  value={member.name}
                                  onSelect={() => {
                                    setFormData((prev) => {
                                      const newAssignees = prev.assignees.includes(member.name)
                                        ? prev.assignees.filter((a) => a !== member.name)
                                        : [...prev.assignees, member.name]
                                      return { ...prev, assignees: newAssignees }
                                    })
                                  }}
                                  className="text-xs"
                                >
                                  <div
                                    className={cn(
                                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                      formData.assignees.includes(member.name)
                                        ? "bg-primary text-primary-foreground"
                                        : "opacity-50 [&_svg]:invisible",
                                    )}
                                  >
                                    <Check className={cn("h-4 w-4")} />
                                  </div>
                                  <Avatar className="w-5 h-5 mr-2">
                                    <AvatarFallback className={`${member.color} text-white text-[9px]`}>
                                      {member.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  {member.name}
                                </CommandItem>
                              ))}
                            </ScrollArea>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" /> Start Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.startDate || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value || null }))}
                    className="h-9 text-xs"
                    style={{ colorScheme: preferences.darkMode ? "dark" : "light" }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" /> End Date
                  </Label>
                  <Input
                    type="date"
                    value={formData.dueDate || ""}
                    min={formData.startDate || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value || null }))}
                    className="h-9 text-xs"
                    style={{ colorScheme: preferences.darkMode ? "dark" : "light" }}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label className="flex items-center text-muted-foreground text-xs">
                  <Tag className="w-3.5 h-3.5 mr-1.5" /> Tags
                </Label>
                <TagInput
                  tags={formData.tags || []}
                  onAddTag={handleAddTagWrapper}
                  onRemoveTag={handleRemoveTagWrapper}
                />
              </div>
              {/* Removed Private Task Switch */}
            </form>
          </ScrollArea>

          <div className="w-full md:w-1/2 flex flex-col md:pl-3 md:border-l md:border-border">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="discussion">
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5 sm:mr-1" />{" "}
                  <span className="hidden sm:inline">Discussion</span>{" "}
                  {(task?.comments?.length || 0) > 0 && `(${task?.comments?.length})`}
                </TabsTrigger>
                <TabsTrigger value="subtasks">
                  <GitFork className="w-3.5 h-3.5 mr-1.5 sm:mr-1" /> <span className="hidden sm:inline">Subtasks</span>{" "}
                  {subtasks.length > 0 && `(${subtasks.length})`}
                </TabsTrigger>
                <TabsTrigger value="attachments">
                  <Paperclip className="w-3.5 h-3.5 mr-1.5 sm:mr-1" /> <span className="hidden sm:inline">Files</span>{" "}
                  {(task?.attachments?.length || 0) + filesToUpload.length > 0 &&
                    `(${(task?.attachments?.length || 0) + filesToUpload.length})`}
                </TabsTrigger>
                <TabsTrigger value="dependencies">
                  <Link2 className="w-3.5 h-3.5 mr-1.5 sm:mr-1" /> <span className="hidden sm:inline">Links</span>{" "}
                  {(formData.dependsOn?.length || 0) > 0 && `(${formData.dependsOn?.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="discussion" className="flex-grow flex flex-col overflow-hidden mt-3">
                <ScrollArea className="flex-grow pr-2 -mr-2">
                  {(task?.comments || [])
                    .filter((c) => !c.parentId)
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map((comment) => renderComment(comment, task?.comments || []))}
                  {(task?.comments || []).length === 0 && (
                    <p className="text-xs text-center text-muted-foreground py-4">No discussion yet.</p>
                  )}
                </ScrollArea>
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="comment-author" className="text-xs text-muted-foreground whitespace-nowrap">
                      Comment as:
                    </Label>
                    <Select value={selectedCommentAuthor} onValueChange={setSelectedCommentAuthor}>
                      <SelectTrigger id="comment-author" className="h-8 text-xs flex-grow min-w-[150px]">
                        <SelectValue>
                          <div className="flex items-center">
                            <Avatar className="w-5 h-5 mr-2">
                              <AvatarFallback
                                className={`${getTeamMemberColorByName(selectedCommentAuthor)} text-white text-[9px]`}
                              >
                                {selectedCommentAuthor
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            {selectedCommentAuthor}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.name} value={member.name} className="text-xs">
                            <div className="flex items-center">
                              <Avatar className="w-5 h-5 mr-2">
                                <AvatarFallback className={`${member.color} text-white text-[9px]`}>
                                  {member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              {member.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {replyingTo && (
                    <div className="text-xs text-muted-foreground mb-1.5 flex justify-between items-center">
                      <span>
                        Replying to <strong>{task?.comments?.find((c) => c.id === replyingTo)?.author}</strong>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-xs"
                        onClick={() => setReplyingTo(null)}
                      >
                        <X className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    </div>
                  )}
                  <div className="relative">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={replyingTo ? "Write your reply..." : "Add a comment..."}
                      rows={2}
                      className="pr-10"
                      onKeyDown={handleCommentKeyDown}
                    />
                    <Button
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-primary hover:bg-primary/90"
                      onClick={handlePostComment}
                      disabled={!newComment.trim() || !task || !selectedCommentAuthor}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="subtasks" className="flex-grow overflow-y-auto p-1 mt-3 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8"
                  onClick={handleAddSubtask}
                  disabled={!task && !onTriggerCreateTask}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Subtask
                </Button>
                {subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-xs hover:bg-accent cursor-pointer"
                    onClick={() => handleEditSubtask(sub)}
                  >
                    <span className={cn(sub.status === "Completed" && "line-through text-muted-foreground")}>
                      {sub.title}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {sub.status}
                    </Badge>
                  </div>
                ))}
                {subtasks.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-4">No subtasks.</p>
                )}
              </TabsContent>

              <TabsContent value="attachments" className="flex-grow overflow-y-auto p-1 mt-3 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs mb-2 h-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!task} // Only allow adding attachments to existing tasks
                >
                  <UploadCloud className="w-3.5 h-3.5 mr-1" /> Add Files
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                />
                {filesToUpload.length > 0 && (
                  <div className="space-y-1.5 my-2">
                    <p className="text-xs font-medium text-muted-foreground">New files to upload:</p>
                    {filesToUpload.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="truncate" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-muted-foreground/80 text-[10px]">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-5 h-5"
                          onClick={() => removeFileToUpload(file.name)}
                        >
                          <X className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {(task?.attachments || []).length > 0 && filesToUpload.length > 0 && <Separator className="my-2" />}
                {(task?.attachments || []).map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-1.5 rounded-md bg-muted/50 text-xs">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-primary flex items-center gap-1.5 truncate"
                      title={att.fileName}
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="truncate">{att.fileName}</span>
                    </a>
                    <span className="text-muted-foreground text-[10px]">{att.fileType}</span>
                  </div>
                ))}
                {(task?.attachments || []).length === 0 && filesToUpload.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-4">No attachments.</p>
                )}
              </TabsContent>

              <TabsContent value="dependencies" className="flex-grow overflow-y-auto p-1 mt-3 space-y-3">
                <div>
                  <Label className="flex items-center text-muted-foreground text-xs mb-1.5">
                    <Link2 className="w-3.5 h-3.5 mr-1.5" /> Prerequisites
                  </Label>
                  {prerequisiteTasks.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {prerequisiteTasks.map((depTask) => (
                        <div
                          key={depTask.id}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-xs"
                        >
                          <span className={cn(depTask.status === "Completed" && "line-through text-muted-foreground")}>
                            {depTask.title}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-5 h-5"
                            onClick={() => handleToggleDependency(depTask.id)}
                          >
                            <Link2Off className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Select
                    onValueChange={(value) => {
                      if (value) handleToggleDependency(value)
                    }}
                    disabled={!task}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Add prerequisite task..." />
                    </SelectTrigger>
                    <SelectContent>
                      {!task && <div className="p-2 text-xs text-muted-foreground">Save task first.</div>}
                      {task && availableTasksForDependencies.length === 0 && (
                        <div className="p-2 text-xs text-muted-foreground">No tasks available.</div>
                      )}
                      {task &&
                        availableTasksForDependencies.map((availTask) => (
                          <SelectItem key={availTask.id} value={availTask.id} className="text-xs">
                            {availTask.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {task && tasks.filter((t) => t.dependsOn?.includes(task.id)).length > 0 && (
                  <div>
                    <Label className="flex items-center text-muted-foreground text-xs mb-1.5">
                      <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-yellow-500" /> Dependent Tasks
                    </Label>
                    <div className="space-y-1">
                      {tasks
                        .filter((t) => t.dependsOn?.includes(task.id))
                        .map((depTask) => (
                          <div key={depTask.id} className="p-2 rounded-md bg-muted/30 text-xs text-muted-foreground">
                            {depTask.title}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border flex-shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form="task-form"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {task ? "Saving..." : "Creating..."}
              </>
            ) : task ? (
              "Save Changes"
            ) : (
              "Create Task"
            )}
          </Button>
        </DialogFooter>

        {showDeleteConfirm && (
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
              </DialogHeader>
              <p>
                Are you sure you want to delete task "{task?.title}"? This action (and deleting its subtasks) cannot be
                undone.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteConfirm}>
                  Delete Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
