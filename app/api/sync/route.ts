import { type NextRequest, NextResponse } from "next/server"
import { documentStore } from "@/lib/document-store"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const lastVersion = Number.parseInt(url.searchParams.get("version") || "0")

    const state = documentStore.getState()

    if (state.document.version > lastVersion) {
      return NextResponse.json(state)
    }

    return NextResponse.json({ users: state.users })
  } catch (error) {
    return NextResponse.json({ error: "Failed to sync" }, { status: 500 })
  }
}
