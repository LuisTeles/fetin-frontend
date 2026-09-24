import type { NoteTag } from "@/lib/api/notes"

// ─── Types ────────────────────────────────────────────────────────────────────

export type FlashcardGrade = "again" | "hard" | "good" | "easy"

export interface FlashcardRef {
    id: string
    front: string
}

export interface Flashcard {
    id: string
    topicId: string
    examId: string | null
    front: string
    back: string
    isArchived: boolean
    easeFactor: number
    repetitions: number
    intervalDays: number
    dueAt: string
    lastReviewedAt: string | null
    createdAt: string
    updatedAt: string
    topic: { id: string; name: string; subject: { id: string; name: string } }
    exam: { id: string; examDate: string; subject?: { name: string } } | null
    tags: NoteTag[]
    _count: { outgoingLinks: number; incomingLinks: number }
}

export interface FlashcardDetail extends Flashcard {
    outgoingLinks: { targetCard: FlashcardRef }[]
    incomingLinks: { sourceCard: FlashcardRef }[]
    reviews: { id: string; grade: FlashcardGrade; reviewedAt: string; intervalAfter: number }[]
}

export interface TopicRollup {
    advanced: boolean
    intervalAfter: number
    nextReviewAt: string
    accuracy: number
}

export interface ReviewResult {
    card: Flashcard
    rollup: TopicRollup | null
    sessionCompleted: boolean
}

export interface CreateFlashcardPayload {
    front: string
    back: string
    topicId: string
    examId?: string
    tagIds?: string[]
}

export interface UpdateFlashcardPayload {
    front?: string
    back?: string
    topicId?: string
    examId?: string | null
    isArchived?: boolean
    tagIds?: string[]
}

export interface FlashcardQuery {
    topicId?: string
    examId?: string
    tagId?: string
    q?: string
    includeArchived?: boolean
    /** Admin impersonation (read-only). */
    userId?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function qs(params: (FlashcardQuery & { limit?: number }) = {}): string {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== "" && v !== false) sp.set(k, String(v))
    }
    const s = sp.toString()
    return s ? `?${s}` : ""
}

/** An API failure that keeps the HTTP status, so callers can tell 404/409 from the rest. */
export class FlashcardApiError extends Error {
    readonly status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = "FlashcardApiError"
        this.status = status
    }
}

async function request<T>(url: string, init: RequestInit | undefined, fallback: string): Promise<T> {
    const res = await fetch(url, {
        cache: "no-store",
        ...init,
        headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new FlashcardApiError(err.message ?? fallback, res.status)
    }
    return (await res.json()) as T
}

// ─── API helpers (client-side fetch to the Next.js proxy) ──────────────────────

export async function apiGetFlashcards(params?: FlashcardQuery): Promise<Flashcard[]> {
    const data = await request<{ flashcards: Flashcard[] }>(`/api/flashcards${qs(params)}`, undefined, "Erro ao carregar flashcards.")
    return data.flashcards ?? []
}

export async function apiGetDueFlashcards(
    params?: Pick<FlashcardQuery, "topicId" | "examId" | "userId"> & { limit?: number }
): Promise<Flashcard[]> {
    const data = await request<{ flashcards: Flashcard[] }>(`/api/flashcards/due${qs(params)}`, undefined, "Erro ao carregar revisões.")
    return data.flashcards ?? []
}

export async function apiGetFlashcard(id: string, userId?: string | null): Promise<FlashcardDetail> {
    const data = await request<{ flashcard: FlashcardDetail }>(`/api/flashcards/${id}${qs({ userId })}`, undefined, "Flashcard não encontrado.")
    return data.flashcard
}

export async function apiCreateFlashcard(payload: CreateFlashcardPayload): Promise<Flashcard> {
    const data = await request<{ flashcard: Flashcard }>("/api/flashcards", { method: "POST", body: JSON.stringify(payload) }, "Erro ao criar flashcard.")
    return data.flashcard
}

export async function apiUpdateFlashcard(id: string, payload: UpdateFlashcardPayload): Promise<Flashcard> {
    const data = await request<{ flashcard: Flashcard }>(`/api/flashcards/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, "Erro ao salvar flashcard.")
    return data.flashcard
}

export async function apiDeleteFlashcard(id: string): Promise<void> {
    await request(`/api/flashcards/${id}`, { method: "DELETE" }, "Erro ao excluir flashcard.")
}

export async function apiReviewFlashcard(id: string, grade: FlashcardGrade, studySessionId?: string | null): Promise<ReviewResult> {
    const body = studySessionId ? { grade, studySessionId } : { grade }
    return request<ReviewResult>(`/api/flashcards/${id}/review`, { method: "POST", body: JSON.stringify(body) }, "Erro ao registrar revisão.")
}

export async function apiAddFlashcardLink(id: string, targetId: string): Promise<void> {
    await request(`/api/flashcards/${id}/links/${targetId}`, { method: "POST" }, "Erro ao vincular flashcards.")
}

export async function apiRemoveFlashcardLink(id: string, targetId: string): Promise<void> {
    await request(`/api/flashcards/${id}/links/${targetId}`, { method: "DELETE" }, "Erro ao remover vínculo.")
}

/** First line of the front, Markdown and mentions stripped, for labels and pickers. */
export function flashcardLabel(front: string, max = 60): string {
    const line = front.split("\n").find((l) => l.trim()) ?? ""
    const plain = line
        .replace(/@\w+:[0-9a-f-]{36}\[([^\]]+)\]/gi, "$1")
        .replace(/[#*_`>~]/g, "")
        .trim()
    return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain
}
