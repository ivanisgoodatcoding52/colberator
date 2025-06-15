"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Users, Save, FileText, Wifi, WifiOff } from "lucide-react"

interface User {
  id: string
  name: string
  color: string
  lastSeen: number
  cursorPosition?: number
}

interface DocumentState {
  content: string
  lastModified: number
  version: number
}

export default function CollaborativeEditor() {
  const [document, setDocument] = useState<DocumentState>({
    content: "",
    lastModified: Date.now(),
    version: 0,
  })

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [userName, setUserName] = useState("")
  const [hasJoined, setHasJoined] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const syncIntervalRef = useRef<NodeJS.Timeout>()
  const lastSyncVersion = useRef(0)

  // Load initial document state
  const loadDocument = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/document")
      if (response.ok) {
        const data = await response.json()
        setDocument(data.document)
        setUsers(data.users)
        lastSyncVersion.current = data.document.version
        setIsConnected(true)
      }
    } catch (error) {
      console.error("Failed to load document:", error)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Sync with server
  const syncWithServer = useCallback(async () => {
    if (!hasJoined) return

    try {
      const response = await fetch(`/api/sync?version=${lastSyncVersion.current}`)
      if (response.ok) {
        const data = await response.json()

        // Update document if there are changes
        if (data.document && data.document.version > lastSyncVersion.current) {
          setDocument(data.document)
          lastSyncVersion.current = data.document.version
        }

        // Always update users
        if (data.users) {
          setUsers(data.users)
        }

        setIsConnected(true)
      }
    } catch (error) {
      console.error("Sync failed:", error)
      setIsConnected(false)
    }
  }, [hasJoined])

  // Start real-time sync
  useEffect(() => {
    if (hasJoined) {
      loadDocument()

      // Sync every 1 second
      syncIntervalRef.current = setInterval(syncWithServer, 1000)

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current)
        }
      }
    }
  }, [hasJoined, loadDocument, syncWithServer])

  // Handle document changes
  const handleContentChange = async (newContent: string) => {
    setDocument((prev) => ({
      ...prev,
      content: newContent,
      lastModified: Date.now(),
    }))

    // Update cursor position
    if (currentUser && textareaRef.current) {
      try {
        await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            cursorPosition: textareaRef.current.selectionStart,
          }),
        })
      } catch (error) {
        console.error("Failed to update cursor position:", error)
      }
    }

    // Auto-save after 1 second of inactivity
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave(newContent)
    }, 1000)
  }

  // Handle save to server
  const handleSave = async (content?: string) => {
    if (!currentUser) return

    const contentToSave = content || document.content
    setIsSaving(true)

    try {
      const response = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentToSave,
          userId: currentUser.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDocument(data.document)
        setUsers(data.users)
        lastSyncVersion.current = data.document.version
        setIsConnected(true)
      }
    } catch (error) {
      console.error("Failed to save document:", error)
      setIsConnected(false)
    } finally {
      setIsSaving(false)
    }
  }

  // Join the collaborative session
  const handleJoin = async () => {
    if (!userName.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data.user)
        setHasJoined(true)
      }
    } catch (error) {
      console.error("Failed to join:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle key press in name input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoin()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentUser) {
        fetch("/api/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        }).catch(console.error)
      }
    }
  }, [currentUser])

  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>Join Collaborative Editor</CardTitle>
            <p className="text-sm text-muted-foreground">Enter your name to start editing the shared document</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleJoin} className="w-full" disabled={!userName.trim() || isLoading}>
              {isLoading ? "Joining..." : "Join Document"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h1 className="font-semibold text-gray-900">Shared Document</h1>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
              <span className="text-sm text-gray-600">{isConnected ? "Connected" : "Disconnected"}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Active Users */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <div className="flex -space-x-2">
                {users.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                    style={{ backgroundColor: user.color }}
                    title={`${user.name}${user.id === currentUser?.id ? " (You)" : ""}`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {users.length > 5 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-xs font-medium text-white">
                    +{users.length - 5}
                  </div>
                )}
              </div>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <Button onClick={() => handleSave()} disabled={isSaving} size="sm" variant="outline">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-6xl mx-auto p-4">
        <Card className="min-h-[600px]">
          <CardContent className="p-0">
            <textarea
              ref={textareaRef}
              value={document.content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-[600px] p-6 border-none resize-none focus:outline-none font-mono text-sm leading-relaxed"
              placeholder="Start typing your document..."
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              }}
            />
          </CardContent>
        </Card>

        {/* Status Bar */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>Version {document.version}</span>
            <span>Last modified: {new Date(document.lastModified).toLocaleTimeString()}</span>
            {currentUser && <span className="text-blue-600">Editing as {currentUser.name}</span>}
          </div>

          <div className="flex items-center gap-2">
            <span>Active users ({users.length}):</span>
            {users.slice(0, 3).map((user) => (
              <Badge
                key={user.id}
                variant="secondary"
                className="text-xs"
                style={{
                  backgroundColor: `${user.color}20`,
                  color: user.color,
                  borderColor: user.color,
                }}
              >
                {user.name}
                {user.id === currentUser?.id ? " (You)" : ""}
              </Badge>
            ))}
            {users.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{users.length - 3} more
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
