"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Users, Crown, MoreVertical, UserX, UserCheck, Settings, LogOut } from "lucide-react"
import type { RoomParticipant } from "@/lib/websocket-server"

interface UserManagementProps {
  participants: RoomParticipant[]
  currentUser: { name: string; isAdmin: boolean }
  onKickUser: (userId: string) => void
  onTransferAdmin: (userId: string) => void
  onOpenSettings: () => void
  onCloseRoom: () => void
}

export function UserManagement({
  participants,
  currentUser,
  onKickUser,
  onTransferAdmin,
  onOpenSettings,
  onCloseRoom,
}: UserManagementProps) {
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId?: string } | null>(null)

  const handleConfirmAction = () => {
    if (!confirmAction) return

    switch (confirmAction.type) {
      case "kick":
        if (confirmAction.userId) onKickUser(confirmAction.userId)
        break
      case "transfer":
        if (confirmAction.userId) onTransferAdmin(confirmAction.userId)
        break
      case "close":
        onCloseRoom()
        break
    }
    setConfirmAction(null)
  }

  const formatJoinTime = (joinedAt: string) => {
    const date = new Date(joinedAt)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Participants ({participants.length})
          </CardTitle>
          {currentUser.isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onOpenSettings}>
                  <Settings className="w-4 h-4 mr-2" />
                  Room Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setConfirmAction({ type: "close" })}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Close Room
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {participants.map((participant) => (
          <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">{participant.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {participant.name}
                  {participant.name === currentUser.name && " (You)"}
                </span>
                {participant.isAdmin && <Crown className="w-4 h-4 text-accent flex-shrink-0" />}
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${participant.isOnline ? "bg-green-500" : "bg-gray-400"}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">Joined {formatJoinTime(participant.joinedAt)}</p>
            </div>
            {currentUser.isAdmin && participant.name !== currentUser.name && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!participant.isAdmin && (
                    <DropdownMenuItem onClick={() => setConfirmAction({ type: "transfer", userId: participant.id })}>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Make Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setConfirmAction({ type: "kick", userId: participant.id })}
                    className="text-destructive focus:text-destructive"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Remove User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}

        {/* Confirmation Dialog */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-sm mx-4">
              <CardHeader>
                <CardTitle>Confirm Action</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {confirmAction.type === "kick" && "Are you sure you want to remove this user from the room?"}
                  {confirmAction.type === "transfer" && "Are you sure you want to transfer admin rights to this user?"}
                  {confirmAction.type === "close" &&
                    "Are you sure you want to close this room? All participants will be disconnected."}
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleConfirmAction} variant="destructive" className="flex-1">
                    Confirm
                  </Button>
                  <Button onClick={() => setConfirmAction(null)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
