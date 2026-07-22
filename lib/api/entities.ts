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

// ─── API helpers ───────────────────────────────────────────────────────────────

export async function apiGetSubjects(): Promise<SubjectEntity[]> {
    const res = await fetch("/api/subjects", { cache: "no-store" })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao carregar disciplinas.")
    }
    const data = await res.json()
    return (data.subjects ?? []) as SubjectEntity[]
}

export async function apiGetTopics(subjectId?: string): Promise<TopicEntity[]> {
    const qs = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : ""
    const res = await fetch(`/api/topics${qs}`, { cache: "no-store" })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao carregar tópicos.")
    }
    const data = await res.json()
    return (data.topics ?? []) as TopicEntity[]
}

export async function apiGetExams(): Promise<ExamEntity[]> {
    const res = await fetch("/api/exams", { cache: "no-store" })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? "Erro ao carregar provas.")
    }
    const data = await res.json()
    return (data.exams ?? []) as ExamEntity[]
}

// ─── Unified search for @ mention popover ─────────────────────────────────────

export type MentionEntityType = "subject" | "topic" | "exam" | "note"

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

    const [subjects, topics, exams] = await Promise.allSettled([
        apiGetSubjects(),
        apiGetTopics(),
        apiGetExams(),
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
            const label = e.subject?.name
                ? `Prova — ${e.subject.name}`
                : `Prova ${new Date(e.examDate).toLocaleDateString("pt-BR")}`
            const sublabel = new Date(e.examDate).toLocaleDateString("pt-BR")
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

    return results.slice(0, 30)
}
