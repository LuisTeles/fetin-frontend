import { formatDateSafe } from "@/lib/format"
import { apiGetFlashcards, flashcardLabel } from "@/lib/api/flashcards"

// ─── Shared entity types for the Notes linking system ─────────────────────────

export interface SubjectEntity {
    id: string
    name: string
    priorityWeight: number
    createdAt: string
}

export interface TopicEntity {
    id: string
    name: string
    subjectId: string
    isCompleted: boolean
    createdAt: string
}

export interface ExamEntity {
    id: string
    subjectId: string
    examDate: string
    createdAt: string
    subject?: { name: string }
}

/**
 * "Prova de Cálculo I · 04/10/2026". Never renders "Invalid Date": a missing/unparseable date
 * drops the date part, a missing subject drops the subject.
 */
export function formatExamLabel(exam: { examDate?: string; subject?: { name: string } }): string {
  const date = formatDateSafe(exam.examDate, "")
  const subject = exam.subject?.name
  if (subject) return date ? `Prova de ${subject} · ${date}` : `Prova de ${subject}`
  return date ? `Prova · ${date}` : "Prova (sem data)"
}

// ─── API helpers ───────────────────────────────────────────────────────────────

export async function apiGetSubjects(userId?: string | null): Promise<SubjectEntity[]> {
    const qs = userId ? `?${new URLSearchParams({ userId }).toString()}` : ""
    const res = await fetch(`/api/subjects${qs}`, { cache: "no-store" })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao carregar disciplinas.")
    }
    const data = await res.json()
    return (data.subjects ?? []) as SubjectEntity[]
}

export async function apiGetTopics(subjectId?: string, userId?: string | null): Promise<TopicEntity[]> {
    const params = new URLSearchParams()
    if (subjectId) params.set("subjectId", subjectId)
    if (userId) params.set("userId", userId)
    const qs = params.toString() ? `?${params.toString()}` : ""
    const res = await fetch(`/api/topics${qs}`, { cache: "no-store" })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao carregar tópicos.")
    }
    const data = await res.json()
    return (data.topics ?? []) as TopicEntity[]
}

/** Every topic of the user: GET /topics requires a subjectId, so fetch per subject. */
export async function apiGetAllTopics(userId?: string | null): Promise<TopicEntity[]> {
    const subjects = await apiGetSubjects(userId)
    const lists = await Promise.all(subjects.map((s) => apiGetTopics(s.id, userId)))
    return lists.flat()
}

export async function apiGetExams(): Promise<ExamEntity[]> {
    const res = await fetch("/api/exams", { cache: "no-store" })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao carregar provas.")
    }
    const data = await res.json()
    // The exams route is snake_case (exam_date, subject_name); normalise to ExamEntity here.
    return ((data.exams ?? []) as Array<Record<string, unknown>>).map((e) => ({
        id: e.id as string,
        subjectId: (e.subjectId ?? e.subject_id) as string,
        examDate: (e.examDate ?? e.exam_date) as string,
        createdAt: (e.createdAt ?? e.created_at) as string,
        subject:
            (e.subject as { name: string } | undefined) ??
            (e.subject_name ? { name: e.subject_name as string } : undefined),
    }))
}

// ─── Unified search for @ mention popover ─────────────────────────────────────

export type MentionEntityType = "subject" | "topic" | "exam" | "note" | "card"

export interface MentionResult {
    id: string
    type: MentionEntityType
    label: string
    sublabel?: string
}

/**
 * Searches all entity types and returns ranked results for the @ mention popover.
 * Falls back gracefully if any entity type fails to load.
 */
export async function apiSearchMentionEntities(
    query: string,
    notes?: Array<{ id: string; title: string | null; content: string }>,
): Promise<MentionResult[]> {
    const q = query.toLowerCase().trim()

    const [subjects, topics, exams, cards] = await Promise.allSettled([
        apiGetSubjects(),
        apiGetAllTopics(),
        apiGetExams(),
        apiGetFlashcards(q ? { q } : undefined),
    ])

    const results: MentionResult[] = []

    // Subjects
    if (subjects.status === "fulfilled") {
        for (const s of subjects.value) {
            if (!q || s.name.toLowerCase().includes(q)) {
                results.push({ id: s.id, type: "subject", label: s.name })
            }
        }
    }

    // Topics
    if (topics.status === "fulfilled") {
        for (const t of topics.value) {
            if (!q || t.name.toLowerCase().includes(q)) {
                results.push({ id: t.id, type: "topic", label: t.name })
            }
        }
    }

    // Exams
    if (exams.status === "fulfilled") {
        for (const e of exams.value) {
            const sublabel = formatDateSafe(e.examDate, "")
            const label = formatExamLabel(e)
            if (!q || label.toLowerCase().includes(q) || sublabel.includes(q)) {
                results.push({ id: e.id, type: "exam", label, sublabel })
            }
        }
    }

    // Notes (passed in from parent to avoid re-fetch)
    if (notes) {
        for (const n of notes) {
            const noteLabel = n.title ?? n.content.slice(0, 40)
            if (!q || noteLabel.toLowerCase().includes(q)) {
                results.push({ id: n.id, type: "note", label: noteLabel })
            }
        }
    }

    // Flashcards (server-side search on front and back)
    if (cards.status === "fulfilled") {
        for (const c of cards.value.slice(0, 20)) {
            results.push({ id: c.id, type: "card", label: flashcardLabel(c.front, 40), sublabel: c.topic.name })
        }
    }

    return results.slice(0, 30)
}
