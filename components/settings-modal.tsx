"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { PanelLeft, PanelTop, Check, XIcon, Trash2, PlusCircle, Palette, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUserPreferencesStore, useConfigStore } from "@/lib/store"
import type { UserPreferences, ConfigItem, TeamMember, StatusConfig } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const StringListManager: React.FC<{
  title: string
  items: string[]
  onAdd: (item: string) => void
  onRemove: (item: string) => void
  noun?: string
}> = ({ title, items, onAdd, onRemove, noun = "item" }) => {
  const [newItem, setNewItem] = useState("")

  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onAdd(newItem.trim())
      setNewItem("")
    } else if (items.includes(newItem.trim())) {
      toast.error(`${noun.charAt(0).toUpperCase() + noun.slice(1)} "${newItem.trim()}" already exists.`)
    } else {
      toast.error(`${noun.charAt(0).toUpperCase() + noun.slice(1)} name cannot be empty.`)
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="flex gap-2">
        <Input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={`New ${noun}...`}
          className="h-9 text-xs"
        />
        <Button onClick={handleAdd} size="sm" className="h-9 text-xs">
          <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      <ScrollArea className="h-40 border rounded-md bg-muted/30 p-2">
        {items.length === 0 && <p className="text-xs text-muted-foreground p-2">No {noun}s defined.</p>}
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item} className="flex items-center justify-between p-1.5 rounded-md text-xs hover:bg-accent">
              <span className="truncate">{item}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(item)}
                className="w-6 h-6 text-muted-foreground hover:text-destructive"
                title={`Remove ${item}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  )
}

const StatusManager: React.FC<{
  items: StatusConfig[]
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  onReorder: (oldIndex: number, newIndex: number) => void
  onUpdateWip: (name: string, limit: number | null) => void
}> = ({ items, onAdd, onRemove, onReorder, onUpdateWip }) => {
  const [newItem, setNewItem] = useState("")
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleAdd = () => {
    if (newItem.trim() && !items.find((i) => i.name === newItem.trim())) {
      onAdd(newItem.trim())
      setNewItem("")
    } else if (items.find((i) => i.name === newItem.trim())) {
      toast.error(`Status "${newItem.trim()}" already exists.`)
    } else {
      toast.error(`Status name cannot be empty.`)
    }
  }

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }
    onReorder(draggedIndex, dropIndex)
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleWipChange = (name: string, value: string) => {
    const limit = value === "" ? null : Number.parseInt(value, 10)
    if (limit === null || (!isNaN(limit) && limit >= 0)) {
      onUpdateWip(name, limit)
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Statuses</h4>
      <div className="flex gap-2">
        <Input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="New status..."
          className="h-9 text-xs"
        />
        <Button onClick={handleAdd} size="sm" className="h-9 text-xs">
          <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      <ScrollArea className="h-40 border rounded-md bg-muted/30 p-2">
        {items.length === 0 && <p className="text-xs text-muted-foreground p-2">No statuses defined.</p>}
        <ul className="space-y-1" onDragOver={(e) => e.preventDefault()}>
          {items.map((item, index) => (
            <li
              key={item.name}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center justify-between p-1.5 rounded-md text-xs hover:bg-accent transition-all cursor-grab active:cursor-grabbing",
                draggedIndex === index && "opacity-50 bg-primary/10 ring-2 ring-primary/50",
              )}
            >
              <div className="flex items-center gap-2 flex-grow">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <span className="truncate flex-grow">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={item.wipLimit ?? ""}
                  onChange={(e) => handleWipChange(item.name, e.target.value)}
                  placeholder="WIP"
                  className="h-6 w-16 text-xs text-center"
                  title={`WIP Limit for ${item.name}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(item.name)}
                  className="w-6 h-6 text-muted-foreground hover:text-destructive"
                  title={`Remove ${item.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  )
}

const NamedColorListManager: React.FC<{
  title: string
  items: Array<ConfigItem | TeamMember>
  onAdd: (item: ConfigItem | TeamMember) => void
  onRemove: (name: string) => void
  onUpdateColor: (name: string, color: string) => void
  noun?: string
}> = ({ title, items, onAdd, onRemove, onUpdateColor, noun = "item" }) => {
  const [newItemName, setNewItemName] = useState("")
  const [newItemColor, setNewItemColor] = useState("bg-slate-500")
  const [editingColor, setEditingColor] = useState<{ name: string; color: string } | null>(null)

  const handleAdd = () => {
    if (newItemName.trim() && !items.find((i) => i.name === newItemName.trim())) {
      onAdd({ name: newItemName.trim(), color: newItemColor.trim() || "bg-slate-500" })
      setNewItemName("")
      setNewItemColor("bg-slate-500")
    } else if (items.find((i) => i.name === newItemName.trim())) {
      toast.error(`${noun!.charAt(0).toUpperCase() + noun!.slice(1)} "${newItemName.trim()}" already exists.`)
    } else {
      toast.error(`${noun!.charAt(0).toUpperCase() + noun!.slice(1)} name cannot be empty.`)
    }
  }

  const handleSaveColorEdit = () => {
    if (editingColor) {
      onUpdateColor(editingColor.name, editingColor.color.trim() || "bg-slate-500")
      setEditingColor(null)
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
        <Input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder={`New ${noun} name...`}
          className="h-9 text-xs"
        />
        <Input
          type="text"
          value={newItemColor}
          onChange={(e) => setNewItemColor(e.target.value)}
          placeholder="Tailwind color (e.g. bg-blue-500)"
          className="h-9 text-xs"
        />
        <Button onClick={handleAdd} size="sm" className="h-9 text-xs">
          <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      <ScrollArea className="h-40 border rounded-md bg-muted/30 p-2">
        {items.length === 0 && <p className="text-xs text-muted-foreground p-2">No {noun}s defined.</p>}
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.name} className="flex items-center justify-between p-1.5 rounded-md text-xs hover:bg-accent">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full border border-border/50", item.color)} />
                <span className="truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-1">
                {editingColor?.name === item.name ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={editingColor.color}
                      onChange={(e) => setEditingColor({ ...editingColor, color: e.target.value })}
                      className="h-6 text-xs w-28"
                      placeholder="bg-red-500"
                    />
                    <Button variant="ghost" size="icon" onClick={handleSaveColorEdit} className="w-6 h-6">
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingColor(null)} className="w-6 h-6">
                      <XIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingColor({ name: item.name, color: item.color })}
                    className="w-6 h-6 text-muted-foreground hover:text-primary"
                    title={`Edit color for ${item.name}`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(item.name)}
                  className="w-6 h-6 text-muted-foreground hover:text-destructive"
                  title={`Remove ${item.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  )
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { preferences, setPreferences } = useUserPreferencesStore()
  const configStore = useConfigStore()
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(preferences)
  const [activeTab, setActiveTab] = useState("general")

  useEffect(() => {
    if (isOpen) {
      setLocalPrefs(preferences)
    }
  }, [preferences, isOpen])

  const handleSave = () => {
    setPreferences(localPrefs)
    onClose()
    toast.success("Settings saved successfully!")
  }

  const handleLayoutChange = (layout: "navbar" | "sidebar") => setLocalPrefs((prev) => ({ ...prev, layout }))
  const handleFontChange = (font: "inter" | "roboto" | "source-code-pro" | "lato" | "open-sans") =>
    setLocalPrefs((prev) => ({ ...prev, font }))
  const handleFontSizeChange = (value: number[]) => setLocalPrefs((prev) => ({ ...prev, fontSize: value[0] }))
  const handleLineHeightChange = (value: number[]) => setLocalPrefs((prev) => ({ ...prev, lineHeight: value[0] }))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card text-card-foreground">
        <DialogHeader className="flex flex-row items-center justify-between pr-0 border-b border-border pb-3">
          <DialogTitle>Settings</DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full -mr-2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-2">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-muted/50">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="taskConfig">Task Config</TabsTrigger>
            <TabsTrigger value="teamConfig">Team</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4 pr-3 -mr-3">
            <TabsContent value="general" className="pt-2 space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Layout Preference</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "sidebar", label: "Sidebar", icon: PanelLeft },
                    { value: "navbar", label: "Navbar", icon: PanelTop },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => handleLayoutChange(item.value as "navbar" | "sidebar")}
                      className={cn(
                        "border rounded-md p-3 flex flex-col items-center justify-center space-y-1.5 transition-all relative hover:shadow-md hover:border-primary/50",
                        localPrefs.layout === item.value
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                          : "border-border bg-card hover:bg-accent/50",
                      )}
                    >
                      <item.icon className="w-7 h-7 text-muted-foreground" />
                      <span className="text-xs font-medium">{item.label}</span>
                      {localPrefs.layout === item.value && (
                        <Check className="w-3.5 h-3.5 text-primary absolute top-1.5 right-1.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="pt-2 space-y-6">
              <div>
                <Label className="text-sm font-medium text-foreground">Font Family</Label>
                <Select value={localPrefs.font} onValueChange={handleFontChange}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inter">Inter (Default)</SelectItem>
                    <SelectItem value="roboto">Roboto</SelectItem>
                    <SelectItem value="source-code-pro">Source Code Pro</SelectItem>
                    <SelectItem value="lato">Lato</SelectItem>
                    <SelectItem value="open-sans">Open Sans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div>
                <Label className="text-sm font-medium text-foreground">
                  Font Size: <span className="font-semibold">{localPrefs.fontSize}px</span>
                </Label>
                <Slider
                  value={[localPrefs.fontSize]}
                  onValueChange={handleFontSizeChange}
                  min={12}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>
              <Separator />
              <div>
                <Label className="text-sm font-medium text-foreground">
                  Line Height: <span className="font-semibold">{localPrefs.lineHeight.toFixed(1)}</span>
                </Label>
                <Slider
                  value={[localPrefs.lineHeight]}
                  onValueChange={handleLineHeightChange}
                  min={1.2}
                  max={2.0}
                  step={0.1}
                  className="mt-2"
                />
              </div>
            </TabsContent>

            <TabsContent value="taskConfig" className="pt-2 space-y-6">
              <StatusManager
                items={configStore.statuses}
                onAdd={configStore.addStatus}
                onRemove={configStore.removeStatus}
                onReorder={configStore.reorderStatuses}
                onUpdateWip={configStore.updateStatusWipLimit}
              />
              <Separator />
              <NamedColorListManager
                title="Priorities"
                items={configStore.priorities}
                onAdd={(item) => configStore.addPriority(item as ConfigItem)}
                onRemove={configStore.removePriority}
                onUpdateColor={configStore.updatePriorityColor}
                noun="priority"
              />
              <Separator />
              <StringListManager
                title="Product Areas (Projects)"
                items={configStore.productAreas}
                onAdd={configStore.addProductArea}
                onRemove={configStore.removeProductArea}
                noun="product area"
              />
              <Separator />
              <StringListManager
                title="Effort Sizes"
                items={configStore.effortSizes}
                onAdd={configStore.addEffortSize}
                onRemove={configStore.removeEffortSize}
                noun="effort size"
              />
            </TabsContent>

            <TabsContent value="teamConfig" className="pt-2 space-y-6">
              <NamedColorListManager
                title="Team Members"
                items={configStore.teamMembers}
                onAdd={(item) => configStore.addTeamMember(item as TeamMember)}
                onRemove={configStore.removeTeamMember}
                onUpdateColor={configStore.updateTeamMemberColor}
                noun="team member"
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
        <DialogFooter className="pt-4 border-t border-border">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
