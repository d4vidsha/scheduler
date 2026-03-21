import type { TaskPublic } from "@/client/models"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { saveTaskAndReschedule } from "./shared"

interface EditDialogProps {
  task: TaskPublic | null
  tasks: TaskPublic[]
  onClose: () => void
}

export default function EditDialog({ task, tasks, onClose }: EditDialogProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [duration, setDuration] = useState(30)

  useEffect(() => {
    if (task) {
      setTitle(task.title ?? "")
      setDuration(task.duration ?? 30)
    }
  }, [task])

  async function handleSave() {
    if (!task) return
    await saveTaskAndReschedule(queryClient, tasks, task.id, {
      title,
      duration,
    })
    onClose()
  }

  return (
    <Dialog
      open={task != null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="bg-surface-container-lowest/80 backdrop-blur-[20px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-duration">Duration (minutes)</Label>
            <Input
              id="edit-duration"
              type="number"
              min={15}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
          <Button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-primary to-primary-container text-white hover:opacity-90"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
