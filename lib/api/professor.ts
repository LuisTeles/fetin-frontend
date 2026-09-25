// Types for the professor dashboard and assignments, plus the two client-side writes.
// Reads happen in Server Components through `getAnalytics` (lib/server-data.ts); only the
// mutations go through the BFF (app/api/assignments/*). Keys are snake_case, as the backend sends them.

export interface DashboardOverview {
    roster_size: number
    active_last_7d: number
    avg_retention: number | null
    avg_adherence: number | null
    at_risk_count: number
    avg_assignment_score_pct: number | null
}

export interface RetentionBucket {
    bucket: string
    count: number
}

export interface DisciplineRetention {
    name: string
    student_count: number
    avg_retention: number | null
    buckets: RetentionBucket[]
}

export interface WeakTopic {
    topic: string
    subject: string
    avg_retention: number
    student_count: number
}

export interface ClassStudent {
    id: string
    name: string
    avg_retention: number | null
    next_exam_readiness: number | null
    adherence_30d: number | null
    last_active_at: string | null
    at_risk: boolean
    assignments_sent: number
    assignments_submitted: number
    avg_score_pct: number | null
}

export interface StudentDetail {
    id: string
    name: string
    subjects: { name: string; avg_retention: number | null; studied_topics: number }[]
    exams: { subject: string; exam_date: string; days_to_exam: number; readiness_projected: number | null; readiness_current: number | null }[]
    adherence_by_weekday: { weekday: number; completed: number; total: number }[]
    assignments: { id: string; title: string; status: AssignmentStatus; score: number | null; max_score: number | null; submitted_at: string | null }[]
}

export type AssignmentStatus = "SENT" | "SUBMITTED"

export interface SentAssignment {
    id: string
    student: { id: string; name: string }
    title: string
    status: AssignmentStatus
    sent_at: string
    due_at: string | null
    score: number | null
    max_score: number | null
}

export interface MyAssignment {
    id: string
    professor: { id: string; name: string }
    title: string
    status: AssignmentStatus
    sent_at: string
    due_at: string | null
    score: number | null
    max_score: number | null
}

export interface QuizQuestionView {
    id: string
    prompt: string
    points: number
    options: string[]
    multi: boolean
}

export interface AssignmentResult {
    score: number
    max_score: number
    per_question: { id: string; correct: boolean; chosen: number[]; expected: number[]; prompt?: string; options?: string[]; points?: number }[]
}

export interface AssignmentView {
    id: string
    title: string
    status: AssignmentStatus
    professor: { id: string; name: string }
    due_at: string | null
    material: string
    questions: QuizQuestionView[]
    result?: AssignmentResult
}

export interface AssignmentReview {
    id: string
    title: string
    status: AssignmentStatus
    student: { id: string; name: string }
    sent_at: string
    due_at: string | null
    result: AssignmentResult | null
}

export class AssignmentApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message)
    }
}

async function post<T>(url: string, body: unknown, fallback: string): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new AssignmentApiError(err.message ?? fallback, res.status)
    }
    return (await res.json()) as T
}

export function apiCreateAssignment(payload: { studentId: string; title: string; content: string; dueAt?: string }) {
    return post<{ id: string; status: AssignmentStatus; max_score: number }>("/api/assignments", payload, "Erro ao enviar a atividade.")
}

export function apiSubmitAssignment(id: string, answers: Record<string, number[]>) {
    return post<AssignmentResult>(`/api/assignments/${id}/submit`, { answers }, "Erro ao enviar as respostas.")
}
