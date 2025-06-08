"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Edit3, Share2, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTaskStore } from "@/lib/store"
import type { Task } from "@/lib/types"
import { TaskDetailPageContent } from "@/components/task-detail-page-content"
import { toast } from "sonner"

export default function TaskDetailPage() {
  const router = useRouter()
  const params = useParams()
  const taskId = params.taskId as string

  const { getTaskById, isLoading: tasksLoading } = useTaskStore()
  const [task, setTask] = useState<Task | null | undefined>(undefined) // undefined for initial, null for not found

  useEffect(() => {
    if (taskId) {
      const foundTask = getTaskById(taskId)
      setTask(foundTask)
    }
  }, [taskId, getTaskById])

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success("Link copied to clipboard!")
      })
      .catch(() => {
        toast.error("Failed to copy link.")
      })
  }

  const handleEdit = () => {
    router.push(`/?editTask=${taskId}`)
  }

  if (tasksLoading || task === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading task details...</p>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Task Not Found</h1>
        <p className="text-muted-foreground mb-6">The task you are looking for does not exist or has been moved.</p>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Board
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/artemis-logo.png" alt="ART3MIS Logo" width={32} height={32} />
            <span className="font-bold text-lg">ART3MIS Task Detail</span>
          </Link>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Board
            </Button>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit Task
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <TaskDetailPageContent task={task} />
      </main>
      {/* 
        The TaskModal is not directly rendered here. 
        Editing navigates back to the main app, which handles the modal.
      */}
    </div>
  )
}
