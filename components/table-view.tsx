"use client"

import type React from "react"
import { useState, useRef, useEffect, useMemo } from "react" // Added useMemo
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Edit,
  Trash2,
  GripVertical,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTaskStore, useUserPreferencesStore } from "@/lib/store"
import { staticConfig } from "@/lib/config"
import type { Task } from "@/lib/types"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "@/lib/utils"

interface TableViewProps {
  tasks: Task[]
  onEditTask: (task: Task) => void
}

type SortField = "title" | "status" | "priority" | "startDate" | "dueDate" | "effort" | "order" | "productArea"
type SortDirection = "asc" | "desc"

const DEFAULT_COLUMN_WIDTH = 160
const MIN_COLUMN_WIDTH = 90

export function TableView({ tasks, onEditTask }: TableViewProps) {
  const { updateTask, deleteTask, deleteTasks, toggleTaskCompletion, reorderTask } = useTaskStore()
  const { preferences, setPreferences } = useUserPreferencesStore()

  const [sortField, setSortField] = useState<SortField>("order")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: "title" } | null>(null)
  const [editValue, setEditValue] = useState("")

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  const initialColumnWidths = {
    checkbox: 45,
    dragHandle: 45,
    title: 280,
    status: 130,
    priority: 110,
    assignees: 160,
    startDate: 130,
    dueDate: 130,
    effort: 90,
    productArea: 160,
    actions: 90,
  }

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    preferences.tableColumnWidths && Object.keys(preferences.tableColumnWidths).length > 0
      ? preferences.tableColumnWidths
      : initialColumnWidths,
  )

  const isResizing = useRef<string | null>(null)
  const initialResizeX = useRef<number>(0)
  const initialResizeWidth = useRef<number>(0)

  const tableContainerRef = useRef<HTMLDivElement>(null)

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (sortField === "order") {
        return sortDirection === "asc" ? (a.order ?? 0) - (b.order ?? 0) : (b.order ?? 0) - (a.order ?? 0)
      }
      let aValue: any = a[sortField as keyof Task]
      let bValue: any = b[sortField as keyof Task]

      if (sortField === "startDate" || sortField === "dueDate") {
        aValue = aValue ? new Date(aValue).getTime() : 0
        bValue = bValue ? new Date(bValue).getTime() : 0
      }
      if (sortField === "priority") {
        const priorityOrder = { Highest: 4, High: 3, Medium: 2, Low: 1 }
        aValue = priorityOrder[aValue as keyof typeof priorityOrder] || 0
        bValue = priorityOrder[bValue as keyof typeof priorityOrder] || 0
      }
      if (aValue === undefined && bValue !== undefined) return sortDirection === "asc" ? 1 : -1
      if (aValue !== undefined && bValue === undefined) return sortDirection === "asc" ? -1 : 1
      if (aValue === undefined && bValue === undefined) return 0
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [tasks, sortField, sortDirection])

  const rowVirtualizer = useVirtualizer({
    count: sortedTasks.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60,
    overscan: 5,
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleSelectRow = (taskId: string) => {
    setSelectedRowIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) newSet.delete(taskId)
      else newSet.add(taskId)
      return newSet
    })
  }

  const handleSelectAllRows = () => {
    if (selectedRowIds.size === sortedTasks.length && sortedTasks.length > 0) setSelectedRowIds(new Set())
    else setSelectedRowIds(new Set(sortedTasks.map((task) => task.id)))
  }

  const handleBulkDelete = () => {
    if (selectedRowIds.size > 0 && confirm(`Delete ${selectedRowIds.size} tasks?`)) {
      deleteTasks(Array.from(selectedRowIds))
      setSelectedRowIds(new Set())
    }
  }

  const startEditing = (task: Task, field: "title") => {
    setEditingCell({ taskId: task.id, field })
    setEditValue(task[field])
  }
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)
  const saveEdit = () => {
    if (editingCell) {
      updateTask(editingCell.taskId, { [editingCell.field]: editValue })
      setEditingCell(null)
    }
  }
  const cancelEdit = () => setEditingCell(null)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") saveEdit()
    if (e.key === "Escape") cancelEdit()
  }

  const getPriorityColor = (p: string) =>
    staticConfig.priorities[p as keyof typeof staticConfig.priorities] || "bg-slate-400"
  const getTeamMemberColor = (n: string) => staticConfig.teamMembers.find((m) => m.name === n)?.color || "bg-slate-400"
  const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1.5 opacity-40" />
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1.5 text-blue-500" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1.5 text-blue-500" />
    )
  }

  const handleMouseDownResize = (e: React.MouseEvent, columnKey: string) => {
    isResizing.current = columnKey
    initialResizeX.current = e.clientX
    initialResizeWidth.current = columnWidths[columnKey] || DEFAULT_COLUMN_WIDTH
    document.body.style.cursor = "col-resize"
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const diffX = e.clientX - initialResizeX.current
      const newWidth = Math.max(MIN_COLUMN_WIDTH, initialResizeWidth.current + diffX)
      setColumnWidths((prev) => ({ ...prev, [isResizing.current!]: newWidth }))
    }
    const handleMouseUp = () => {
      if (isResizing.current) {
        setPreferences({ tableColumnWidths: columnWidths })
      }
      isResizing.current = null
      document.body.style.cursor = "default"
    }
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [columnWidths, setPreferences])

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, taskId: string) => {
    setDraggedItemId(taskId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", taskId)
  }

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    e.preventDefault()
    if (draggedItemId && draggedItemId !== targetId) {
      setDropTargetId(targetId)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    e.preventDefault()
    if (draggedItemId && draggedItemId !== targetId) {
      reorderTask(draggedItemId, targetId)
    }
    setDraggedItemId(null)
    setDropTargetId(null)
  }

  const handleDragEnd = () => {
    setDraggedItemId(null)
    setDropTargetId(null)
  }

  const columns = [
    {
      key: "checkbox",
      header: (
        <Checkbox
          className="ml-1"
          checked={selectedRowIds.size === sortedTasks.length && sortedTasks.length > 0}
          onCheckedChange={handleSelectAllRows}
        />
      ),
      cell: (task: Task) => (
        <Checkbox
          className="ml-1"
          checked={selectedRowIds.has(task.id)}
          onCheckedChange={() => handleSelectRow(task.id)}
        />
      ),
    },
    {
      key: "dragHandle",
      header: "",
      cell: () => (
        <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-grab opacity-60 hover:opacity-100" />
      ),
    },
    {
      key: "title",
      header: "Task",
      sortable: true,
      cell: (task: Task) =>
        editingCell?.taskId === task.id && editingCell.field === "title" ? (
          <Input
            type="text"
            value={editValue}
            onChange={handleEditChange}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="text-sm h-8 py-1 bg-white dark:bg-slate-800"
          />
        ) : (
          <div onClick={() => startEditing(task, "title")} className="cursor-pointer group overflow-hidden">
            <div
              className={cn(
                "font-medium text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate",
                task.status === "Completed" && "line-through opacity-70",
              )}
              title={task.title}
            >
              {task.title}
            </div>
            <div
              className={cn(
                "text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1",
                task.status === "Completed" && "opacity-70",
              )}
              title={task.description}
            >
              {task.description}
            </div>
          </div>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (task: Task) => (
        <Badge variant="outline" className="capitalize text-xs py-0.5 px-1.5">
          {task.status}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      cell: (task: Task) => (
        <Badge className={`${getPriorityColor(task.priority)} text-white text-xs py-0.5 px-1.5`}>{task.priority}</Badge>
      ),
    },
    {
      key: "assignees",
      header: "Assignees",
      cell: (task: Task) => (
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 3).map((a, i) => (
            <Avatar key={i} className="w-7 h-7 border-2 border-white dark:border-slate-900">
              <AvatarFallback className={`${getTeamMemberColor(a)} text-white text-[10px] font-medium`}>
                {a
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
          ))}
          {task.assignees.length > 3 && (
            <Avatar className="w-7 h-7 border-2 border-white dark:border-slate-900">
              <AvatarFallback className="text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                +{task.assignees.length - 3}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      ),
    },
    {
      key: "startDate",
      header: "Start",
      sortable: true,
      cell: (task: Task) => (
        <span className="text-xs text-slate-700 dark:text-slate-300">{formatDate(task.startDate)}</span>
      ),
    },
    {
      key: "dueDate",
      header: "End",
      sortable: true,
      cell: (task: Task) => (
        <span className="text-xs text-slate-700 dark:text-slate-300">{formatDate(task.dueDate)}</span>
      ),
    },
    {
      key: "effort",
      header: "Effort",
      sortable: true,
      cell: (task: Task) => (
        <Badge variant="secondary" className="text-xs py-0.5 px-1.5">
          {task.effort}
        </Badge>
      ),
    },
    {
      key: "productArea",
      header: "Project",
      sortable: true,
      cell: (task: Task) => (
        <Badge variant="outline" className="text-xs py-0.5 px-1.5 truncate" title={task.productArea}>
          {task.productArea}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (task: Task) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => onEditTask(task)} className="text-xs">
                <Edit className="w-3.5 h-3.5 mr-2" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleTaskCompletion(task.id)} className="text-xs">
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
              <DropdownMenuItem
                onClick={() => {
                  if (confirm(`Delete "${task.title}"?`)) deleteTask(task.id)
                }}
                className="text-red-500 hover:!text-red-500 focus:text-red-500 focus:!bg-red-50 dark:focus:!bg-red-900/50 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-3 flex flex-col flex-grow">
      <div className="flex items-center justify-between flex-shrink-0">
        <h2 className="text-xl font-semibold text-foreground">Task Table</h2>
        <div className="flex items-center space-x-2">
          {selectedRowIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-8 text-xs">
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete ({selectedRowIds.size})
            </Button>
          )}
          <div className="text-xs text-muted-foreground">{sortedTasks.length} tasks</div>
        </div>
      </div>

      <div
        ref={tableContainerRef}
        className="bg-card rounded-lg shadow-sm border border-border overflow-auto flex-grow"
      >
        <table className="w-full text-sm border-collapse table-fixed">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900/80 backdrop-blur-sm border-b border-border">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3.5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider relative group whitespace-nowrap"
                  style={{ width: columnWidths[col.key] || DEFAULT_COLUMN_WIDTH }}
                >
                  <div className="flex items-center">
                    {col.sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort(col.key as SortField)}
                        className="p-0 hover:bg-transparent text-xs font-semibold text-muted-foreground uppercase tracking-wider -ml-1"
                      >
                        {col.header} <SortIcon field={col.key as SortField} />
                      </Button>
                    ) : (
                      <span
                        className={
                          col.key === "checkbox" || col.key === "dragHandle"
                            ? "flex justify-center items-center w-full"
                            : ""
                        }
                      >
                        {col.header}
                      </span>
                    )}
                  </div>
                  {col.key !== "actions" && col.key !== "checkbox" && (
                    <div
                      onMouseDown={(e) => handleMouseDownResize(e, col.key)}
                      className="absolute top-0 right-0 w-2 h-full cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500/40 transition-opacity z-20"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const task = sortedTasks[virtualRow.index]
              if (!task) return null
              const isDragged = draggedItemId === task.id
              const isDropTarget = dropTargetId === task.id

              return (
                <tr
                  key={task.id}
                  draggable={sortField === "order"}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDrop={(e) => handleDrop(e, task.id)}
                  onDragEnd={handleDragEnd}
                  onDragLeave={() => setDropTargetId(null)}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={cn(
                    "border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors duration-75 relative",
                    selectedRowIds.has(task.id)
                      ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      : "",
                    task.status === "Completed" && "opacity-60 dark:opacity-50 hover:opacity-80 dark:hover:opacity-70",
                    isDragged && "opacity-30",
                  )}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {isDropTarget && (
                    <td colSpan={columns.length} className="p-0 absolute -top-0.5 left-0 right-0">
                      <div className="h-1 bg-blue-500 rounded-full" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3.5 py-3 align-middle ${col.key === "checkbox" || col.key === "dragHandle" ? "text-center" : ""}`}
                      style={{
                        width: columnWidths[col.key] || DEFAULT_COLUMN_WIDTH,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {col.cell(task)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        {sortedTasks.length === 0 && (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No tasks found. Try adjusting your filters.
          </div>
        )}
      </div>
    </div>
  )
}
