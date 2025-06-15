import { type NextRequest, NextResponse } from "next/server"
import { documentStore } from "@/lib/document-store"

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"]

export async function POST(request: NextRequest) {
  try {
    const { name, userId } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const user = {
      id: userId || Math.random().toString(36).substr(2, 9),
      name,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      lastSeen: Date.now(),
    }

    documentStore.addUser(user)

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ error: "Failed to add user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, cursorPosition } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "UserId is required" }, { status: 400 })
    }

    documentStore.updateUser(userId, { cursorPosition })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "UserId is required" }, { status: 400 })
    }

    documentStore.removeUser(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to remove user" }, { status: 500 })
  }
}
