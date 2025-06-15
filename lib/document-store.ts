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

interface DocumentStore {
  document: DocumentState
  users: Map<string, User>
}

// In-memory storage (in production, use a database)
const store: DocumentStore = {
  document: {
    content:
      "Welcome to the Collaborative Editor!\n\nStart typing to see real-time collaboration in action. Multiple users can edit this document simultaneously.\n\nTry opening this page in multiple browser tabs to simulate different users editing together.",
    lastModified: Date.now(),
    version: 1,
  },
  users: new Map(),
}

export const documentStore = {
  getDocument(): DocumentState {
    return { ...store.document }
  },

  updateDocument(content: string, userId: string): DocumentState {
    store.document = {
      content,
      lastModified: Date.now(),
      version: store.document.version + 1,
    }

    // Update user's last seen time
    const user = store.users.get(userId)
    if (user) {
      store.users.set(userId, { ...user, lastSeen: Date.now() })
    }

    return { ...store.document }
  },

  addUser(user: User): void {
    store.users.set(user.id, user)
  },

  updateUser(userId: string, updates: Partial<User>): void {
    const user = store.users.get(userId)
    if (user) {
      store.users.set(userId, { ...user, ...updates, lastSeen: Date.now() })
    }
  },

  removeUser(userId: string): void {
    store.users.delete(userId)
  },

  getUsers(): User[] {
    const now = Date.now()
    // Remove users inactive for more than 30 seconds
    for (const [id, user] of store.users.entries()) {
      if (now - user.lastSeen > 30000) {
        store.users.delete(id)
      }
    }
    return Array.from(store.users.values())
  },

  getState(): { document: DocumentState; users: User[] } {
    return {
      document: this.getDocument(),
      users: this.getUsers(),
    }
  },
}
