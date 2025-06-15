import { type NextRequest, NextResponse } from "next/server"
import { documentStore } from "@/lib/document-store"

export async function GET() {
  try {
    const state = documentStore.getState()
    return NextResponse.json(state)
  } catch (error) {
    return NextResponse.json({ error: "Failed to get document" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, userId } = await request.json()

    if (!content || !userId) {
      return NextResponse.json({ error: "Content and userId are required" }, { status: 400 })
    }

    const document = documentStore.updateDocument(content, userId)
    const users = documentStore.getUsers()

    return NextResponse.json({ document, users })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
  }
}
