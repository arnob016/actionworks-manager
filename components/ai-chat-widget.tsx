"use client"

import { useState, useRef, useEffect, type FormEvent } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, UserIcon, Loader2, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTaskStore, useConfigStore } from "@/lib/store"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  isProposal?: boolean
  proposalData?: any // Stores the full proposal object from ART3MIS
  userName?: string
}

export function AiChatWidget() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeProposal, setActiveProposal] = useState<any | null>(null)

  const { teamMembers } = useConfigStore()
  const [currentUser, setCurrentUser] = useState<string>(() => teamMembers[0]?.name || "User")

  useEffect(() => {
    if (teamMembers.length > 0 && !teamMembers.find((tm) => tm.name === currentUser)) {
      setCurrentUser(teamMembers[0].name)
    }
  }, [teamMembers, currentUser])

  const sendMessageToServer = async (
    messageContent: string,
    isUserInitiatedSubmit = true,
    userSpeaking = currentUser,
    confirmedProposalData?: any, // Used when confirming a proposal
  ) => {
    if (isUserInitiatedSubmit && messageContent.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: messageContent,
        userName: userSpeaking,
      }
      setMessages((prev) => [...prev, userMessage])
    }
    setInput("")
    setIsLoading(true)
    setActiveProposal(null) // Clear previous proposal when sending new message or confirming

    try {
      const requestBody: any = { currentUser }
      if (confirmedProposalData) {
        requestBody.message = "USER_CONFIRMED_PROPOSAL"
        requestBody.proposalToConfirm = confirmedProposalData
      } else {
        requestBody.message = messageContent
      }

      const response = await fetch("/api/google-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API request failed with status ${response.status}`)
      }

      const data = await response.json()
      const assistantMessageContent = data.responseText || "Sorry, I didn't get a clear response."
      let isProposal = false
      let proposalDataForMessage: any = null

      if (data.action === "PROPOSE_TASK_OPERATIONS" || data.action === "PROPOSE_CONFIGURATION_CHANGE") {
        setActiveProposal(data) // Set the full proposal data
        isProposal = true
        proposalDataForMessage = data
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantMessageContent,
        isProposal: isProposal,
        proposalData: proposalDataForMessage,
      }
      setMessages((prev) => [...prev, assistantMessage])

      if (data.operationsProcessed === true) {
        // Check if operations were processed (after confirmation)
        useTaskStore.getState().fetchTasks() // Refresh tasks if any CUD operation happened
        // Potentially refresh config if config changes were made and store supports it
      }
    } catch (error: any) {
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${error.message || "Could not connect to the AI assistant."}`,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || activeProposal) return // Don't allow new messages if a proposal is pending
    sendMessageToServer(input, true, currentUser)
  }

  const handleConfirmProposal = () => {
    if (!activeProposal) return
    const userConfirmationDisplayMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "Yes, please proceed.",
      userName: currentUser,
    }
    setMessages((prev) => [...prev, userConfirmationDisplayMessage])
    sendMessageToServer("USER_CONFIRMED_PROPOSAL", false, currentUser, activeProposal)
    // setActiveProposal(null) // Cleared in sendMessageToServer
  }

  const handleCancelProposal = () => {
    if (!activeProposal) return
    const userCancellationDisplayMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "No, cancel that.",
      userName: currentUser,
    }
    setMessages((prev) => [...prev, userCancellationDisplayMessage])
    // Send a message to ART3MIS indicating cancellation
    sendMessageToServer("USER_CANCELLED_PROPOSAL", false, currentUser, activeProposal)
    // setActiveProposal(null); // Cleared in sendMessageToServer
  }

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector("div[data-radix-scroll-area-viewport]")
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight
      }
    }
  }, [messages])

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      if (messages.length === 0) {
        setMessages([
          {
            id: "initial-greeting",
            role: "assistant",
            content: "Hello! I'm ART3MIS. How can I help you manage your tasks or configurations today?",
          },
        ])
      }
    } else {
      setActiveProposal(null) // Clear proposal when modal closes
    }
  }, [isModalOpen]) // Removed messages.length dependency to avoid re-triggering initial message

  const getUserInitials = (name: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const selectedUserConfig = teamMembers.find((tm) => tm.name === currentUser)

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="lg"
          className="fixed bottom-6 right-6 rounded-full w-16 h-16 shadow-xl z-50 flex items-center justify-center bg-background p-0"
          aria-label="Open AI Chat"
        >
          <Image src="/artemis-logo.png" alt="ART3MIS Logo" width={64} height={64} className="rounded-full" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl md:max-w-4xl h-[90vh] flex flex-col p-0 bg-card text-card-foreground">
        <DialogHeader className="p-4 border-b border-border space-y-2">
          <div className="flex items-center">
            <Image src="/artemis-logo.png" alt="ART3MIS Logo" width={28} height={28} className="mr-2" />
            <div>
              <DialogTitle className="text-lg">ART3MIS</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Autonomous Response & Task Efficiency Management Intelligence System
              </p>
            </div>
          </div>
          <div className="pt-2">
            <Select value={currentUser} onValueChange={setCurrentUser}>
              <SelectTrigger className="w-full h-9 text-xs">
                <div className="flex items-center">
                  <UserIcon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <span className="mr-1">Speaking as:</span>
                  <SelectValue placeholder="Select user" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.name} value={member.name} className="text-xs">
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={cn("flex items-start space-x-2.5", msg.role === "user" ? "justify-end" : "")}>
                  {msg.role === "assistant" && (
                    <Avatar className="w-7 h-7">
                      <Image src="/artemis-logo.png" alt="ART3MIS Logo" width={28} height={28} />
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "p-2.5 rounded-lg max-w-[80%] whitespace-pre-wrap text-sm shadow-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none",
                    )}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <Avatar className="w-7 h-7">
                      <AvatarFallback
                        className={cn(
                          "text-xs",
                          selectedUserConfig?.color ? selectedUserConfig.color : "bg-gray-400",
                          selectedUserConfig?.color ? "text-white" : "text-black",
                        )}
                      >
                        {getUserInitials(msg.userName || currentUser)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                {msg.role === "assistant" &&
                  msg.isProposal &&
                  activeProposal && // Check activeProposal state
                  messages[messages.length - 1]?.id === msg.id && ( // Only show for the latest proposal message
                    <div className="flex justify-start space-x-2 mt-2 ml-10">
                      <Button
                        size="sm"
                        onClick={handleConfirmProposal}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                        disabled={isLoading}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelProposal}
                        className="text-xs"
                        disabled={isLoading}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
                      </Button>
                    </div>
                  )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start space-x-2.5">
                <Avatar className="w-7 h-7">
                  <Image src="/artemis-logo.png" alt="ART3MIS Logo" width={28} height={28} />
                </Avatar>
                <div className="p-2.5 rounded-lg bg-muted text-foreground rounded-bl-none shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form
          onSubmit={handleSubmit}
          className={cn(
            "flex items-center space-x-2 p-4 border-t border-border",
            activeProposal && "opacity-50 pointer-events-none", // Disable input when proposal is active
          )}
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeProposal ? "Please confirm or cancel the proposal above." : "Ask about tasks or give commands..."
            }
            className="flex-grow h-10 text-sm"
            disabled={isLoading || !!activeProposal}
            aria-label="Chat input"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim() || !!activeProposal}
            className="h-10 w-10 flex-shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
