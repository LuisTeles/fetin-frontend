// ─── Tag ───────────────────────────────────────────────────────────────────────

export interface Tag {
    id: string
    name: string
    color: string // hex e.g. "#EF4444"
    createdAt: string
    _count?: { notes: number }
}

export interface CreateTagPayload {
    name: string
    color: string
}

export interface UpdateTagPayload {
    name?: string
    color?: string
}

// ─── Note ──────────────────────────────────────────────────────────────────────

export interface NoteTag {
    tagId: string
    tag: Pick<Tag, "id" | "name" | "color">
}

export interface LinkedNote {
    id: string
    title: string | null
    content: string
}

export interface NoteLink {
    targetNote?: LinkedNote
    sourceNote?: LinkedNote
}

export interface NoteSubject {
    id: string
    name: string
}

export interface NoteTopic {
    id: string
    name: string
}

export interface NoteExam {
    id: string
    examDate: string
}

export interface Note {
    id: string
    title: string | null
    content: string
    isArchived: boolean
    createdAt: string
    updatedAt: string
    subjectId: string | null
    topicId: string | null
    examId: string | null
    subject: NoteSubject | null
    topic: NoteTopic | null
    exam: NoteExam | null
    tags: NoteTag[]
    outgoingLinks: NoteLink[]
    incomingLinks: NoteLink[]
}

export interface CreateNotePayload {
    title?: string
    content: string
    subjectId?: string
    topicId?: string
    examId?: string
    tagIds?: string[]
}

export interface UpdateNotePayload {
    title?: string
    content?: string
    isArchived?: boolean
    subjectId?: string | null
    topicId?: string | null
    examId?: string | null
    tagIds?: string[]
}

export interface NoteQueryParams {
    subjectId?: string
    topicId?: string
    examId?: string
    tagId?: string
    includeArchived?: boolean
}

// ─── API helpers (client-side fetch to Next.js proxy) ──────────────────────────

export async function apiGetTags(): Promise<Tag[]> {
    const res = await fetch("/api/tags", { cache: "no-store" })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao carregar tags.")
    }
    const data = await res.json()
    return data.tags as Tag[]
}

export async function apiCreateTag(payload: CreateTagPayload): Promise<Tag> {
    const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao criar tag.")
    }
    const data = await res.json()
    return data.tag as Tag
}

export async function apiUpdateTag(id: string, payload: UpdateTagPayload): Promise<Tag> {
    const res = await fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao atualizar tag.")
    }
    const data = await res.json()
    return data.tag as Tag
}

export async function apiDeleteTag(id: string): Promise<void> {
    const res = await fetch(`/api/tags/${id}`, { method: "DELETE" })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao excluir tag.")
    }
}

export async function apiGetNotes(params?: NoteQueryParams): Promise<Note[]> {
    const searchParams = new URLSearchParams()
    if (params?.subjectId) searchParams.set("subjectId", params.subjectId)
    if (params?.topicId) searchParams.set("topicId", params.topicId)
    if (params?.examId) searchParams.set("examId", params.examId)
    if (params?.tagId) searchParams.set("tagId", params.tagId)
    if (params?.includeArchived) searchParams.set("includeArchived", "true")

    const qs = searchParams.toString()
    const res = await fetch(qs ? `/api/notes?${qs}` : "/api/notes", { cache: "no-store" })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao carregar notas.")
    }
    const data = await res.json()
    return data.notes as Note[]
}

export async function apiGetNote(id: string): Promise<Note> {
    const res = await fetch(`/api/notes/${id}`, { cache: "no-store" })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao carregar nota.")
    }
    const data = await res.json()
    return data.note as Note
}

export async function apiCreateNote(payload: CreateNotePayload): Promise<Note> {
    const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao criar nota.")
    }
    const data = await res.json()
    return data.note as Note
}

export async function apiUpdateNote(id: string, payload: UpdateNotePayload): Promise<Note> {
    const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao atualizar nota.")
    }
    const data = await res.json()
    return data.note as Note
}

export async function apiDeleteNote(id: string): Promise<void> {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao excluir nota.")
    }
}

// ─── Note-to-Note Links ────────────────────────────────────────────────────────

export async function apiAddNoteLink(noteId: string, targetNoteId: string): Promise<void> {
    const res = await fetch(`/api/notes/${noteId}/links/${targetNoteId}`, {
        method: "POST",
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao criar vínculo.")
    }
}

export async function apiRemoveNoteLink(noteId: string, targetNoteId: string): Promise<void> {
    const res = await fetch(`/api/notes/${noteId}/links/${targetNoteId}`, {
        method: "DELETE",
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao remover vínculo.")
    }
}
