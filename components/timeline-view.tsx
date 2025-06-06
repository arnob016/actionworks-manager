"use client"

import type React from "react"
import { useState, useMemo, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react" // Added Inbox
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTaskStore, useConfigStore } from "@/lib/store"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const DAY_WIDTH_PX_BASE = 100
const TASK_BAR_HEIGHT_PX = 26
const TASK_BAR_VERTICAL_SPACING_PX = 4
const DAY_HEADER_HEIGHT_PX = 50
const ASSIGNEE_ROW_HEADER_WIDTH_PX = 180
// const ASSIGNEE_INFO_HEIGHT_PX = 40; // Not currently used, can be removed if not planned
const MIN_ASSIGNEE_ROW_CONTENT_HEIGHT_PX = TASK_BAR_HEIGHT_PX + TASK_BAR_VERTICAL_SPACING_PX * 2
// const TASK_ICON_SIZE = "w-3 h-3"; // Not currently used, can be removed

type TimelineZoomLevel = "week" | "2weeks" | "month"

interface PositionedTask extends Task {
  ui: { left: number; width: number; rowInAssigneeLane: number; startsBeforeView: boolean; endsAfterView: boolean }
}

interface TimelineViewProps {
  tasks: Task[] // These are already filtered tasks from TaskManagementApp
  onEditTask: (task: Task) => void
  onCreateTaskForDateAssignee: (date: Date, assigneeName: string) => void
  selectedAssigneeFilter: string | null
  selectedProjectFilter: string | null
}

export function TimelineView({
  tasks: allFilteredTasks,
  onEditTask,
  onCreateTaskForDateAssignee,
  selectedAssigneeFilter,
  selectedProjectFilter,
}: TimelineViewProps) {
  const { getSubtasks } = useTaskStore() // updateTask removed as it's not used
  const { teamMembers, getTeamMemberColorByName, getPriorityColorByName } = useConfigStore()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [zoomLevel, setZoomLevel] = useState<TimelineZoomLevel>("month")
  const [dayWidthPx, setDayWidthPx] = useState(DAY_WIDTH_PX_BASE * 0.7)

  const timelineGridRef = useRef<HTMLDivElement>(null)
  const assigneeHeaderRef = useRef<HTMLDivElement>(null)

  const viewSpecificFilteredTasks = useMemo(() => {
    return allFilteredTasks.filter((task) => {
      const matchesAssignee = selectedAssigneeFilter ? task.assignees.includes(selectedAssigneeFilter) : true
      const matchesProject = selectedProjectFilter ? task.productArea === selectedProjectFilter : true
      return matchesAssignee && matchesProject
    })
  }, [allFilteredTasks, selectedAssigneeFilter, selectedProjectFilter])

  const assigneesToDisplay = useMemo(() => {
    if (selectedAssigneeFilter) {
      const member = teamMembers.find((tm) => tm.name === selectedAssigneeFilter)
      return member ? [member] : []
    }
    const assigneesWithTasks = new Set<string>()
    viewSpecificFilteredTasks.forEach((task) => task.assignees.forEach((a) => assigneesWithTasks.add(a)))

    // If no tasks, display all team members to allow task creation for them
    if (assigneesWithTasks.size === 0 && viewSpecificFilteredTasks.length === 0) {
      return teamMembers
    }
    return teamMembers.filter((tm) => assigneesWithTasks.has(tm.name))
  }, [teamMembers, selectedAssigneeFilter, viewSpecificFilteredTasks])

  useEffect(() => {
    let newDayWidth: number
    switch (zoomLevel) {
      case "week":
        newDayWidth = DAY_WIDTH_PX_BASE * 1.5
        break
      case "2weeks":
        newDayWidth = DAY_WIDTH_PX_BASE
        break
      default:
        newDayWidth = DAY_WIDTH_PX_BASE * 0.65
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
      default:
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
    const grid = timelineGridRef.current
    const header = assigneeHeaderRef.current
    if (!grid || !header) return
    const syncScroll = (e: Event) => {
      if (e.target === grid) header.scrollTop = grid.scrollTop
      else if (e.target === header) grid.scrollTop = header.scrollTop
    }
    grid.addEventListener("scroll", syncScroll)
    header.addEventListener("scroll", syncScroll)
    return () => {
      grid.removeEventListener("scroll", syncScroll)
      header.removeEventListener("scroll", syncScroll)
    }
  }, [])

  const navigateTimeline = (direction: "prev" | "next") => {
    let newDate: Date
    switch (zoomLevel) {
      case "week":
        newDate = addDays(currentDate, direction === "next" ? 7 : -7)
        break
      case "2weeks":
        newDate = addDays(currentDate, direction === "next" ? 14 : -14)
        break
      default:
        const monthStart = startOfMonth(currentDate)
        newDate = startOfMonth(direction === "next" ? addDays(monthStart, 35) : addDays(monthStart, -5))
        break
    }
    setCurrentDate(newDate)
  }

  const { positionedTasksByAssignee, assigneeRowHeights } = useMemo(() => {
    const newPositionedTasksByAssignee: Record<string, PositionedTask[]> = {}
    const newAssigneeRowHeights: Record<string, number> = {}
    if (!firstDayInView || !lastDayInView || daysInView.length === 0)
      return { positionedTasksByAssignee: newPositionedTasksByAssignee, assigneeRowHeights: newAssigneeRowHeights }

    assigneesToDisplay.forEach((assignee) => {
      const tasksForAssignee = viewSpecificFilteredTasks.filter((task) => task.assignees.includes(assignee.name))
      const relevantTasks = tasksForAssignee
        .filter((task) => {
          if (!task.startDate || !task.dueDate) return false
          let taskStart: Date, taskEnd: Date
          try {
            taskStart = parseISO(task.startDate)
            taskEnd = parseISO(task.dueDate)
          } catch (e) {
            return false
          }
          if (isNaN(taskStart.getTime()) || isNaN(taskEnd.getTime())) return false
          return taskEnd >= firstDayInView && taskStart <= lastDayInView && taskEnd >= taskStart
        })
        .sort((a, b) => {
          const durationA = differenceInDays(parseISO(a.dueDate), parseISO(a.startDate))
          const durationB = differenceInDays(parseISO(b.dueDate), parseISO(b.startDate))
          if (durationA !== durationB) return durationB - durationA
          return parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
        })

      const occupiedRowsByDay: Record<number, Set<number>> = {}
      const finalPositionedTasks: PositionedTask[] = []
      let maxRowInAssigneeLane = 0

      for (const task of relevantTasks) {
        const taskStartDate = parseISO(task.startDate)
        const taskEndDate = parseISO(task.dueDate)
        const startsBeforeView = isBefore(taskStartDate, firstDayInView)
        const endsAfterView = isAfter(taskEndDate, lastDayInView)
        const displayStartDate = startsBeforeView ? firstDayInView : taskStartDate
        const displayEndDate = endsAfterView ? lastDayInView : taskEndDate
        let startDayIndex = differenceInDays(displayStartDate, firstDayInView)
        let endDayIndex = differenceInDays(displayEndDate, firstDayInView)
        startDayIndex = Math.max(0, startDayIndex)
        endDayIndex = Math.min(daysInView.length - 1, endDayIndex)
        if (startDayIndex > endDayIndex || isNaN(startDayIndex) || isNaN(endDayIndex)) continue

        let assignedRowInLane = 0
        // eslint-disable-next-line no-constant-condition
        while (true) {
          let conflict = false
          for (let i = startDayIndex; i <= endDayIndex; i++)
            if (occupiedRowsByDay[i]?.has(assignedRowInLane)) {
              conflict = true
              break
            }
          if (!conflict) break
          assignedRowInLane++
        }
        for (let i = startDayIndex; i <= endDayIndex; i++) {
          if (!occupiedRowsByDay[i]) occupiedRowsByDay[i] = new Set()
          occupiedRowsByDay[i].add(assignedRowInLane)
        }
        if (assignedRowInLane > maxRowInAssigneeLane) maxRowInAssigneeLane = assignedRowInLane
        const left = startDayIndex * dayWidthPx
        const width = Math.max(dayWidthPx * 0.25, (endDayIndex - startDayIndex + 1) * dayWidthPx - 2)
        finalPositionedTasks.push({
          ...task,
          ui: { left, width, rowInAssigneeLane: assignedRowInLane, startsBeforeView, endsAfterView },
        })
      }
      newPositionedTasksByAssignee[assignee.name] = finalPositionedTasks
      newAssigneeRowHeights[assignee.name] = Math.max(
        MIN_ASSIGNEE_ROW_CONTENT_HEIGHT_PX,
        (maxRowInAssigneeLane + 1) * (TASK_BAR_HEIGHT_PX + TASK_BAR_VERTICAL_SPACING_PX) + TASK_BAR_VERTICAL_SPACING_PX,
      )
    })
    return { positionedTasksByAssignee: newPositionedTasksByAssignee, assigneeRowHeights: newAssigneeRowHeights }
  }, [assigneesToDisplay, viewSpecificFilteredTasks, firstDayInView, lastDayInView, daysInView, dayWidthPx])

  const getProductAreaPrefix = (productArea: string | undefined) =>
    productArea ? productArea.substring(0, 2).toUpperCase() : ""

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
          <Select value={zoomLevel} onValueChange={(v) => setZoomLevel(v as TimelineZoomLevel)}>
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

      <div className="flex-grow flex overflow-hidden border border-border rounded-md">
        <div
          ref={assigneeHeaderRef}
          className="w-[var(--assignee-header-width)] flex-shrink-0 overflow-y-auto overflow-x-hidden border-r border-border bg-card"
          style={{ "--assignee-header-width": `${ASSIGNEE_ROW_HEADER_WIDTH_PX}px` } as React.CSSProperties}
        >
          <div className="h-[var(--day-header-height)] sticky top-0 z-20 bg-card border-b border-border flex items-center px-3">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Assignee</span>
          </div>
          {assigneesToDisplay.map((assignee) => (
            <div
              key={assignee.name}
              className="flex items-center px-3 border-b border-border last:border-b-0"
              style={{ height: `${assigneeRowHeights[assignee.name] || MIN_ASSIGNEE_ROW_CONTENT_HEIGHT_PX}px` }}
            >
              <Avatar className="w-6 h-6 mr-2">
                <AvatarFallback className={`${getTeamMemberColorByName(assignee.name)} text-white text-[10px]`}>
                  {assignee.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate text-foreground">{assignee.name}</span>
            </div>
          ))}
        </div>

        <div ref={timelineGridRef} className="flex-grow overflow-auto relative">
          {viewSpecificFilteredTasks.length === 0 && assigneesToDisplay.length > 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground z-0">
              <Inbox className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-500" />
              <h3 className="text-xl font-semibold mb-1">No Tasks to Display</h3>
              <p className="text-sm">
                Try adjusting filters or creating new tasks for the selected assignees/projects.
              </p>
            </div>
          )}
          <div
            className={cn(
              "grid sticky top-0 z-10 bg-card/80 backdrop-blur-sm",
              viewSpecificFilteredTasks.length === 0 &&
                assigneesToDisplay.length > 0 &&
                "opacity-0 pointer-events-none",
            )}
            style={{ gridTemplateColumns: `repeat(${daysInView.length}, minmax(${dayWidthPx}px, 1fr))` }}
          >
            {daysInView.map((date) => (
              <div
                key={`header-${date.toISOString()}`}
                className={cn(
                  "text-center border-r border-b border-border flex flex-col items-center justify-center",
                  isSameDay(date, new Date()) && "is-today-header",
                )}
                style={
                  {
                    height: `var(--day-header-height)`,
                    "--day-header-height": `${DAY_HEADER_HEIGHT_PX}px`,
                  } as React.CSSProperties
                }
              >
                <div className="text-[10px] text-muted-foreground uppercase">{format(date, "EEE")}</div>
                <div
                  className={cn(
                    "text-lg font-medium",
                    isSameDay(date, new Date()) ? "text-primary" : "text-foreground",
                  )}
                >
                  {format(date, "d")}
                </div>
              </div>
            ))}
          </div>

          {assigneesToDisplay.map((assignee) => (
            <div
              key={assignee.name}
              className="relative border-b border-border last:border-b-0 group"
              style={{ height: `${assigneeRowHeights[assignee.name] || MIN_ASSIGNEE_ROW_CONTENT_HEIGHT_PX}px` }}
            >
              <div
                className="grid absolute inset-0"
                style={{ gridTemplateColumns: `repeat(${daysInView.length}, minmax(${dayWidthPx}px, 1fr))` }}
              >
                {daysInView.map((date) => (
                  <div
                    key={`day-bg-${assignee.name}-${date.toISOString()}`}
                    className={cn("border-r border-border/50 relative", isSameDay(date, new Date()) && "bg-primary/5")}
                    onDoubleClick={() => onCreateTaskForDateAssignee(date, assignee.name)}
                  >
                    {isSameDay(date, new Date()) && (
                      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-primary/30 z-0" />
                    )}
                  </div>
                ))}
              </div>
              {(positionedTasksByAssignee[assignee.name] || []).map((task) => {
                const topPosition =
                  task.ui.rowInAssigneeLane * (TASK_BAR_HEIGHT_PX + TASK_BAR_VERTICAL_SPACING_PX) +
                  TASK_BAR_VERTICAL_SPACING_PX / 2
                // const subtasks = getSubtasks(task.id); // Not used in this card display
                const tooltipContent = (
                  <div className="text-xs p-1.5 space-y-0.5">
                    <p className="font-semibold text-sm">{task.title}</p>
                    <p>Status: {task.status}</p>
                    <p>Priority: {task.priority}</p>
                    <p>
                      Dates: {format(parseISO(task.startDate), "MMM d")} - {format(parseISO(task.dueDate), "MMM d")}
                    </p>
                    {task.productArea && <p>Project: {task.productArea}</p>}
                  </div>
                )
                const taskColor = getPriorityColorByName(task.priority) || "bg-primary"
                return (
                  <TooltipProvider key={task.id} delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute rounded-sm px-1.5 py-0.5 text-xs font-medium flex items-center transition-all duration-100 ease-out shadow-sm cursor-pointer",
                            task.status === "Completed"
                              ? "bg-slate-500/70 dark:bg-slate-700/60 border-slate-600/50 dark:border-slate-600/50 text-slate-300 dark:text-slate-400 line-through"
                              : `${taskColor} text-primary-foreground`,
                            "hover:opacity-80",
                            task.ui.startsBeforeView && "rounded-l-none",
                            task.ui.endsAfterView && "rounded-r-none",
                          )}
                          style={{
                            left: `${task.ui.left + 1}px`,
                            width: `${task.ui.width - 2}px`,
                            top: `${topPosition}px`,
                            height: `${TASK_BAR_HEIGHT_PX}px`,
                          }}
                          onClick={() => onEditTask(task)}
                        >
                          {task.ui.startsBeforeView && (
                            <div className="absolute -left-px top-0 bottom-0 w-0.5 bg-current opacity-70 rounded-l-sm" />
                          )}
                          <span className="font-bold mr-1">{getProductAreaPrefix(task.productArea)}</span>
                          <span className="truncate flex-grow">{task.title}</span>
                          {task.ui.endsAfterView && (
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
              })}
            </div>
          ))}
          {assigneesToDisplay.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-10">
              <Inbox className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-500" />
              <h3 className="text-xl font-semibold mb-1">No Assignees to Display</h3>
              <p className="text-sm text-center">
                No team members match the current filters, or there are no tasks for any assignees in this timeframe.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
