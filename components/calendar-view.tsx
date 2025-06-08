"use client"

import type React from "react"
import { useState, useMemo, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, GripVertical, Plus, Paperclip, MessageSquare, ListTree, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTaskStore } from "@/lib/store"
import type { Task } from "@/lib/types"
import {
  addDays,
  format,
  startOfWeek,
  differenceInDays,
  isSameDay,
  parseISO,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  isBefore,
  isAfter,
  getISOWeek,
} from "date-fns"
import { cn } from "@/lib/utils"
import { productAreaColors, priorityBorderColors } from "@/lib/config"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const DAY_WIDTH_PX_BASE = 130
const TASK_BAR_HEIGHT_PX = 28
const TASK_BAR_VERTICAL_SPACING_PX = 4
const DAY_HEADER_HEIGHT_PX = 56
const MIN_TASK_WIDTH_DAYS = 0.25
const NEW_BUTTON_AREA_HEIGHT_PX = 30
const TASK_ICON_SIZE = "w-3.5 h-3.5"

type CalendarZoomLevel = "week" | "2weeks" | "month"

interface PositionedTask extends Task {
  ui: {
    left: number
    width: number
    row: number
    actualRow: number
    startsBeforeView: boolean
    endsAfterView: boolean
    isContinuation?: boolean
    isStartPiece?: boolean
    isEndPiece?: boolean
  }
}

interface CalendarViewProps {
  tasks: Task[]
  onEditTask: (task: Task) => void
  onCreateTaskForDate: (date: Date) => void
}

export function CalendarView({ tasks: tasksFromProps, onEditTask, onCreateTaskForDate }: CalendarViewProps) {
  const { updateTask, getSubtasks } = useTaskStore()
  const tasksToDisplayInCalendar = tasksFromProps

  const [currentDate, setCurrentDate] = useState(new Date())
  const [zoomLevel, setZoomLevel] = useState<CalendarZoomLevel>("month")
  const [dayWidthPx, setDayWidthPx] = useState(DAY_WIDTH_PX_BASE * 0.7)

  const timelineContainerRef = useRef<HTMLDivElement>(null)

  const [draggingTask, setDraggingTask] = useState<{
    task: PositionedTask
    type: "move" | "resizeStart" | "resizeEnd"
    initialMouseX: number
    initialStartDate: Date
    initialEndDate: Date
    dayOffset: number
    currentVisualStartDate?: Date
    currentVisualEndDate?: Date
  } | null>(null)
  const [dragOverDay, setDragOverDay] = useState<Date | null>(null)

  useEffect(() => {
    let newDayWidth: number
    switch (zoomLevel) {
      case "week":
        newDayWidth = DAY_WIDTH_PX_BASE * 1.6
        break
      case "2weeks":
        newDayWidth = DAY_WIDTH_PX_BASE * 1.1
        break
      default:
        newDayWidth = DAY_WIDTH_PX_BASE * 0.75
        break
    }
    setDayWidthPx(newDayWidth)
  }, [zoomLevel])

  const { daysInView, firstDayInView, lastDayInView, viewTitle } = useMemo(() => {
    let localStartDate: Date, numDays: number, title: string
    switch (zoomLevel) {
      case "week":
        localStartDate = startOfWeek(currentDate, { weekStartsOn: 1 })
        numDays = 7
        title = `${format(localStartDate, "MMMM yyyy")} - W${getISOWeek(localStartDate)}`
        break
      case "2weeks":
        localStartDate = startOfWeek(currentDate, { weekStartsOn: 1 })
        numDays = 14
        title = `${format(localStartDate, "MMM d")} - ${format(addDays(localStartDate, 13), "MMM d, yyyy")}`
        break
      default: // month
        localStartDate = startOfMonth(currentDate)
        localStartDate = startOfWeek(localStartDate, { weekStartsOn: 1 })
        const monthEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
        numDays = differenceInCalendarDays(monthEnd, localStartDate) + 1
        title = format(currentDate, "MMMM yyyy")
        break
    }
    const days = Array.from({ length: numDays }, (_, i) => addDays(localStartDate, i))
    return { daysInView: days, firstDayInView: days[0], lastDayInView: days[days.length - 1], viewTitle: title }
  }, [currentDate, zoomLevel])

  useEffect(() => {
    const todayEl = timelineContainerRef.current?.querySelector(".is-today-header")
    if (timelineContainerRef.current && todayEl) {
      const offset = (todayEl as HTMLElement).offsetLeft - timelineContainerRef.current.offsetLeft
      timelineContainerRef.current.scrollLeft = offset - timelineContainerRef.current.offsetWidth / 3 + dayWidthPx / 2
    }
  }, [currentDate, zoomLevel, dayWidthPx, tasksToDisplayInCalendar, firstDayInView])

  const navigateTimeline = (direction: "prev" | "next") => {
    let newDate: Date
    switch (zoomLevel) {
      case "week":
        newDate = addDays(currentDate, direction === "next" ? 7 : -7)
        break
      case "2weeks":
        newDate = addDays(currentDate, direction === "next" ? 14 : -14)
        break
      default: // month
        const monthStart = startOfMonth(currentDate)
        newDate = startOfMonth(direction === "next" ? addDays(monthStart, 35) : addDays(monthStart, -5))
        break
    }
    setCurrentDate(newDate)
  }

  const { positionedTasks, maxRowUsed } = useMemo(() => {
    const relevantTasks = tasksToDisplayInCalendar
      .filter((task) => {
        if (!task.startDate || !task.dueDate) return false
        try {
          const taskStart = parseISO(task.startDate)
          const taskEnd = parseISO(task.dueDate)
          return taskEnd >= firstDayInView && taskStart <= lastDayInView && taskEnd >= taskStart
        } catch {
          return false
        }
      })
      .sort((a, b) => {
        const durationA = differenceInDays(parseISO(a.dueDate), parseISO(a.startDate))
        const durationB = differenceInDays(parseISO(b.dueDate), parseISO(b.startDate))
        if (durationA !== durationB) return durationB - durationA
        return parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
      })

    const occupiedRowsByDay: Record<number, Set<number>> = {}
    const finalPositionedTasks: PositionedTask[] = []
    let currentMaxRow = -1

    for (const task of relevantTasks) {
      const taskStartDate = parseISO(task.startDate)
      const taskEndDate = parseISO(task.dueDate)
      const startsBeforeView = isBefore(taskStartDate, firstDayInView)
      const endsAfterView = isAfter(taskEndDate, lastDayInView)
      const displayStartDate = startsBeforeView ? firstDayInView : taskStartDate
      const displayEndDate = endsAfterView ? lastDayInView : taskEndDate
      const startDayIndex = Math.max(0, differenceInDays(displayStartDate, firstDayInView))
      const endDayIndex = Math.min(daysInView.length - 1, differenceInDays(displayEndDate, firstDayInView))
      if (startDayIndex > endDayIndex) continue

      let assignedRow = 0
      while (true) {
        let conflict = false
        for (let i = startDayIndex; i <= endDayIndex; i++)
          if (occupiedRowsByDay[i]?.has(assignedRow)) {
            conflict = true
            break
          }
        if (!conflict) break
        assignedRow++
      }
      for (let i = startDayIndex; i <= endDayIndex; i++) {
        if (!occupiedRowsByDay[i]) occupiedRowsByDay[i] = new Set()
        occupiedRowsByDay[i].add(assignedRow)
      }
      if (assignedRow > currentMaxRow) currentMaxRow = assignedRow

      const left = startDayIndex * dayWidthPx
      const width = Math.max(dayWidthPx * MIN_TASK_WIDTH_DAYS, (endDayIndex - startDayIndex + 1) * dayWidthPx - 2)
      finalPositionedTasks.push({
        ...task,
        ui: {
          left,
          width,
          row: assignedRow,
          actualRow: assignedRow,
          startsBeforeView,
          endsAfterView,
          isStartPiece: isSameDay(displayStartDate, taskStartDate) || startsBeforeView,
          isEndPiece: isSameDay(displayEndDate, taskEndDate) || endsAfterView,
        },
      })
    }
    return { positionedTasks: finalPositionedTasks, maxRowUsed: currentMaxRow }
  }, [tasksToDisplayInCalendar, daysInView, firstDayInView, lastDayInView, dayWidthPx])

  const actualContentHeight =
    maxRowUsed === -1 ? 0 : (maxRowUsed + 1) * (TASK_BAR_HEIGHT_PX + TASK_BAR_VERTICAL_SPACING_PX)
  const dynamicDayCellHeightBelowHeader = actualContentHeight + NEW_BUTTON_AREA_HEIGHT_PX
  const totalDynamicHeight = DAY_HEADER_HEIGHT_PX + dynamicDayCellHeightBelowHeader

  const handleMouseDown = (e: React.MouseEvent, task: PositionedTask, type: "move" | "resizeStart" | "resizeEnd") => {
    e.preventDefault()
    e.stopPropagation()
    const taskStartDate = parseISO(task.startDate)
    const taskEndDate = parseISO(task.dueDate)
    setDraggingTask({
      task,
      type,
      initialMouseX: e.clientX,
      initialStartDate: taskStartDate,
      initialEndDate: taskEndDate,
      dayOffset: 0,
      currentVisualStartDate: taskStartDate,
      currentVisualEndDate: taskEndDate,
    })
    document.body.style.cursor = type === "move" ? "grabbing" : "ew-resize"
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingTask) return
      const dx = e.clientX - draggingTask.initialMouseX
      const daysDragged = Math.round(dx / dayWidthPx)
      let newStartDate = draggingTask.initialStartDate
      let newEndDate = draggingTask.initialEndDate
      if (draggingTask.type === "move") {
        newStartDate = addDays(draggingTask.initialStartDate, daysDragged)
        newEndDate = addDays(draggingTask.initialEndDate, daysDragged)
      } else if (draggingTask.type === "resizeStart") {
        newStartDate = addDays(draggingTask.initialStartDate, daysDragged)
        if (isAfter(newStartDate, newEndDate)) newStartDate = newEndDate
      } else if (draggingTask.type === "resizeEnd") {
        newEndDate = addDays(draggingTask.initialEndDate, daysDragged)
        if (isBefore(newEndDate, newStartDate)) newEndDate = newStartDate
      }
      setDraggingTask((prev) =>
        prev ? { ...prev, currentVisualStartDate: newStartDate, currentVisualEndDate: newEndDate } : null,
      )
      const containerRect = timelineContainerRef.current?.getBoundingClientRect()
      if (containerRect && timelineContainerRef.current) {
        const xInContainer = e.clientX - containerRect.left + (timelineContainerRef.current.scrollLeft || 0)
        const dayIndex = Math.floor(xInContainer / dayWidthPx)
        if (dayIndex >= 0 && dayIndex < daysInView.length) setDragOverDay(daysInView[dayIndex])
        else setDragOverDay(null)
      }
    }
    const handleMouseUp = (e: MouseEvent) => {
      if (!draggingTask) return
      document.body.style.cursor = "default"
      setDragOverDay(null)
      const finalDx = e.clientX - draggingTask.initialMouseX
      const daysChanged = Math.round(finalDx / dayWidthPx)
      let finalNewStartDate = draggingTask.initialStartDate
      let finalNewEndDate = draggingTask.initialEndDate
      if (draggingTask.type === "move") {
        finalNewStartDate = addDays(draggingTask.initialStartDate, daysChanged)
        finalNewEndDate = addDays(draggingTask.initialEndDate, daysChanged)
      } else if (draggingTask.type === "resizeStart") {
        finalNewStartDate = addDays(draggingTask.initialStartDate, daysChanged)
        if (isAfter(finalNewStartDate, draggingTask.initialEndDate)) finalNewStartDate = draggingTask.initialEndDate
      } else if (draggingTask.type === "resizeEnd") {
        finalNewEndDate = addDays(draggingTask.initialEndDate, daysChanged)
        if (isBefore(finalNewEndDate, draggingTask.initialStartDate)) finalNewEndDate = draggingTask.initialStartDate
      }
      updateTask(draggingTask.task.id, {
        startDate: format(finalNewStartDate, "yyyy-MM-dd"),
        dueDate: format(finalNewEndDate, "yyyy-MM-dd"),
      })
      setDraggingTask(null)
    }
    if (draggingTask) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "default"
      setDragOverDay(null)
    }
  }, [draggingTask, updateTask, dayWidthPx, daysInView])

  const renderTaskElement = (taskToRender: PositionedTask, isGhost = false) => {
    const taskStartDate =
      isGhost && draggingTask?.currentVisualStartDate
        ? draggingTask.currentVisualStartDate
        : parseISO(taskToRender.startDate)
    const taskEndDate =
      isGhost && draggingTask?.currentVisualEndDate ? draggingTask.currentVisualEndDate : parseISO(taskToRender.dueDate)
    const displayStartDate = isBefore(taskStartDate, firstDayInView) ? firstDayInView : taskStartDate
    const displayEndDate = isAfter(taskEndDate, lastDayInView) ? lastDayInView : taskEndDate
    const startDayIndex = Math.max(0, differenceInDays(displayStartDate, firstDayInView))
    const endDayIndex = Math.min(daysInView.length - 1, differenceInDays(displayEndDate, firstDayInView))
    const left = startDayIndex * dayWidthPx
    const width = Math.max(dayWidthPx * MIN_TASK_WIDTH_DAYS, (endDayIndex - startDayIndex + 1) * dayWidthPx - 4)
    const topPosition =
      taskToRender.ui.row * (TASK_BAR_HEIGHT_PX + TASK_BAR_VERTICAL_SPACING_PX) +
      DAY_HEADER_HEIGHT_PX +
      TASK_BAR_VERTICAL_SPACING_PX / 2
    const subtasks = getSubtasks(taskToRender.id)
    const tooltipContent = (
      <div className="text-xs p-1.5 space-y-0.5">
        <p className="font-semibold text-sm">{taskToRender.title}</p>
        <p>Status: {taskToRender.status}</p> <p>Priority: {taskToRender.priority}</p>
        <p>Assignees: {taskToRender.assignees.join(", ") || "Unassigned"}</p>
        <p>
          Dates: {format(parseISO(taskToRender.startDate), "MMM d")} - {format(parseISO(taskToRender.dueDate), "MMM d")}
        </p>
        {taskToRender.productArea && <p>Project: {taskToRender.productArea}</p>}
      </div>
    )
    const taskProductAreaColors = productAreaColors[taskToRender.productArea] || productAreaColors["Default"]
    const taskPriorityBorderColor = priorityBorderColors[taskToRender.priority] || priorityBorderColors["Default"]

    return (
      <TooltipProvider key={isGhost ? `${taskToRender.id}-ghost` : taskToRender.id} delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "absolute rounded-md px-2 py-0.5 text-xs font-medium flex items-center group transition-all duration-100 ease-out shadow-sm border-l-4",
                taskProductAreaColors.background,
                taskProductAreaColors.text,
                taskPriorityBorderColor,
                taskToRender.status === "Completed" && "opacity-60 line-through",
                isGhost
                  ? "opacity-60 z-40 pointer-events-none cursor-grabbing !bg-primary/30 !border-primary"
                  : "cursor-grab",
                draggingTask?.task.id === taskToRender.id && !isGhost && "opacity-40 scale-95",
                taskToRender.ui.startsBeforeView && !taskToRender.ui.isStartPiece && "rounded-l-none",
                taskToRender.ui.endsAfterView && !taskToRender.ui.isEndPiece && "rounded-r-none",
              )}
              style={{
                left: `${left + 2}px`,
                width: `${width}px`,
                top: `${topPosition}px`,
                height: `${TASK_BAR_HEIGHT_PX}px`,
              }}
              onMouseDown={isGhost ? undefined : (e) => handleMouseDown(e, taskToRender, "move")}
              onClick={
                isGhost
                  ? undefined
                  : (e) => {
                      e.stopPropagation()
                      onEditTask(taskToRender)
                    }
              }
            >
              {taskToRender.ui.startsBeforeView && (
                <div className="absolute -left-px top-0 bottom-0 w-0.5 bg-current opacity-70 rounded-l-sm" />
              )}
              <span className="truncate flex-grow mr-1">{taskToRender.title}</span>
              <div className="flex items-center space-x-1.5 flex-shrink-0 ml-auto opacity-70 group-hover:opacity-100 transition-opacity">
                {/* Removed Lock icon for isPrivate */}
                {subtasks && subtasks.length > 0 && (
                  <ListTree
                    className={cn(TASK_ICON_SIZE, "text-blue-500 dark:text-blue-400")}
                    title={`Subtasks: ${subtasks.length}`}
                  />
                )}
                {taskToRender.comments && taskToRender.comments.length > 0 && (
                  <MessageSquare
                    className={cn(TASK_ICON_SIZE, "text-green-500 dark:text-green-400")}
                    title={`Comments: ${taskToRender.comments.length}`}
                  />
                )}
                {taskToRender.attachments && taskToRender.attachments.length > 0 && (
                  <Paperclip
                    className={cn(TASK_ICON_SIZE, "text-purple-500 dark:text-purple-400")}
                    title={`Attachments: ${taskToRender.attachments.length}`}
                  />
                )}
              </div>
              {!isGhost && (
                <>
                  <div
                    className="absolute left-0 top-0 h-full w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 z-10 flex items-center justify-start"
                    onMouseDown={(e) => handleMouseDown(e, taskToRender, "resizeStart")}
                  >
                    <GripVertical className="w-2 h-3 text-muted-foreground/70" />
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-3 cursor-ew-resize opacity-0 group-hover:opacity-100 z-10 flex items-center justify-end"
                    onMouseDown={(e) => handleMouseDown(e, taskToRender, "resizeEnd")}
                  >
                    <GripVertical className="w-2 h-3 text-muted-foreground/70" />
                  </div>
                </>
              )}
              {taskToRender.ui.endsAfterView && (
                <div className="absolute -right-px top-0 bottom-0 w-0.5 bg-current opacity-70 rounded-r-sm" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="start"
            className="bg-popover text-popover-foreground border-border shadow-xl max-w-xs"
          >
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-lg shadow-lg border border-border p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-3 sm:gap-2 flex-shrink-0">
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateTimeline("prev")}
            className="text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground px-2 min-w-[160px] sm:min-w-[200px] text-center">
            {viewTitle}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateTimeline("next")}
            className="text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={zoomLevel} onValueChange={(v) => setZoomLevel(v as CalendarZoomLevel)}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="2weeks">2 Weeks</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs h-9">
            Today
          </Button>
        </div>
      </div>

      <div
        ref={timelineContainerRef}
        className="flex-grow overflow-auto relative select-none pr-1 rounded-md border border-border"
      >
        {positionedTasks.length === 0 && !draggingTask && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Inbox className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="text-xl font-semibold mb-1">No Tasks Scheduled</h3>
            <p className="text-sm">There are no tasks in this date range.</p>
            <p className="text-xs mt-1">Try adjusting filters or creating new tasks.</p>
          </div>
        )}
        <div
          className={cn("grid absolute top-0 left-0", positionedTasks.length === 0 && !draggingTask && "hidden")}
          style={{ gridTemplateColumns: `repeat(${daysInView.length}, minmax(${dayWidthPx}px, 1fr))` }}
        >
          {daysInView.map((date) => (
            <div
              key={`header-${date.toISOString()}`}
              className={cn(
                "text-center border-r border-b border-border sticky top-0 z-20 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center",
                isSameDay(date, new Date()) && "is-today-header",
              )}
              style={{ height: `${DAY_HEADER_HEIGHT_PX}px` }}
            >
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{format(date, "EEE")}</div>
              <div
                className={cn("text-xl font-medium", isSameDay(date, new Date()) ? "text-primary" : "text-foreground")}
              >
                {format(date, "d")}
              </div>
            </div>
          ))}
          {daysInView.map((date, dayIndex) => (
            <div
              key={`daycol-${date.toISOString()}`}
              className={cn(
                "border-r border-border relative group pt-1",
                dragOverDay && isSameDay(dragOverDay, date) && "bg-accent",
              )}
              style={{ gridRowStart: 2, gridColumnStart: dayIndex + 1, height: `${dynamicDayCellHeightBelowHeader}px` }}
              onDragEnter={() => setDragOverDay(date)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as HTMLElement)) setDragOverDay(null)
              }}
              onDrop={() => setDragOverDay(null)}
            >
              {isSameDay(date, new Date()) && (
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-primary/70 z-0">
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-primary rounded-full"></div>
                </div>
              )}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity h-6 px-1.5"
                  onClick={() => onCreateTaskForDate(date)}
                >
                  <Plus className="w-3 h-3 mr-0.5" /> New
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div
          className={cn("relative", positionedTasks.length === 0 && !draggingTask && "hidden")}
          style={{ height: `${totalDynamicHeight}px` }}
        >
          {positionedTasks.map((task) => renderTaskElement(task))}
          {draggingTask && renderTaskElement(draggingTask.task, true)}
        </div>
      </div>
    </div>
  )
}
