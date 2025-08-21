"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Settings, X, Save } from "lucide-react"

interface RoomSettings {
  allowGuestControl: boolean
  maxParticipants: number
  isPublic: boolean
  requireApproval: boolean
}

interface RoomSettingsProps {
  settings: RoomSettings
  onUpdateSettings: (settings: Partial<RoomSettings>) => void
  onClose: () => void
}

export function RoomSettings({ settings, onUpdateSettings, onClose }: RoomSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings)

  const handleSave = () => {
    onUpdateSettings(localSettings)
    onClose()
  }

  const handleSettingChange = (key: keyof RoomSettings, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Room Settings
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="guest-control">Allow Guest Control</Label>
              <p className="text-sm text-muted-foreground">Let non-admins control music playback</p>
            </div>
            <Switch
              id="guest-control"
              checked={localSettings.allowGuestControl}
              onCheckedChange={(checked) => handleSettingChange("allowGuestControl", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-participants">Max Participants: {localSettings.maxParticipants}</Label>
            <Slider
              id="max-participants"
              min={2}
              max={100}
              step={1}
              value={[localSettings.maxParticipants]}
              onValueChange={(value) => handleSettingChange("maxParticipants", value[0])}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="public-room">Public Room</Label>
              <p className="text-sm text-muted-foreground">Room appears in public listings</p>
            </div>
            <Switch
              id="public-room"
              checked={localSettings.isPublic}
              onCheckedChange={(checked) => handleSettingChange("isPublic", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="require-approval">Require Approval</Label>
              <p className="text-sm text-muted-foreground">Admin must approve new participants</p>
            </div>
            <Switch
              id="require-approval"
              checked={localSettings.requireApproval}
              onCheckedChange={(checked) => handleSettingChange("requireApproval", checked)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1 gap-2">
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
