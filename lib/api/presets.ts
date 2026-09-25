// Client-side helpers for professor presets, classes (student side) and class-code linking.
// They call the Next.js BFF (app/api/*), never the NestJS API directly.

// ─── Types ────────────────────────────────────────────────────────────────────

export type TopicWeight = "essential" | "review" | "optional"
export type PresetStatus = "draft" | "published" | "archived"
export type AssessmentKind = "exam" | "assignment"

/** Content keys stay camelCase: the editor round-trips them verbatim and snapshots store them. */
export interface PresetTopic {
    id: string
    parentId: string | null
    position: number
    name: string
    weight: TopicWeight
    estimatedHours: number | null
    difficulty: number | null
    prerequisiteIds: string[]
}

export interface PresetAssessment {
    id: string
    kind: AssessmentKind
    title: string
    /** YYYY-MM-DD — a calendar date, never converted to a zone. */
    date: string
    topicIds: string[]
}

export interface PresetContent {
    topics: PresetTopic[]
    assessments: PresetAssessment[]
}

export interface PresetSummary {
    id: string
    name: string
    description: string | null
    color: string
    status: PresetStatus
    version: number
    created_at: string
    updated_at: string
    topic_count?: number
    assessment_count?: number
}

export interface PresetDetail extends PresetSummary {
    content: PresetContent
}

export interface ProfessorRef {
    id: string
    name: string
}

export interface ClassSummary {
    id: string
    name: string
    description: string | null
    color: string
    professor: ProfessorRef
    version: number
    topic_count: number
    next_exam_date: string | null
    applied: boolean
    application_id: string | null
    applied_version: number | null
    update_available: boolean
}

export interface ClassPreview {
    id: string
    name: string
    description: string | null
    color: string
    professor: ProfessorRef
    version: number
    topics: PresetTopic[]
    assessments: PresetAssessment[]
    applied: boolean
    application_id: string | null
    name_taken: boolean
}

export interface ApplyResult {
    application_id: string
    subject: { id: string; name: string }
    version: number
    created: { topics: number; exams: number; tasks: number }
    skipped: { kind: AssessmentKind; title: string; reason: string }[]
    schedules: { exam_id: string; generated: boolean; reason?: string }[]
}

export interface AppliedClass {
    id: string
    preset_id: string
    name: string | null
    professor: ProfessorRef
    subject_id: string
    version_applied: number
    preset_status: PresetStatus
    applied_at: string
}

export interface RemoveResult {
    message: string
    mode: "detach" | "delete"
    removed?: { topics: number; exams: number; tasks: number; schedules: number }
}

export interface ProfessorLinkItem {
    id: string
    professor: ProfessorRef
}

export interface RosterItem {
    link_id: string
    student_id: string
    name: string
    linked_at: string
}

// ─── Errors ───────────────────────────────────────────────────────────────────

/** Keeps the HTTP status and the backend's structured fields (code, errors[]). */
export class PresetApiError extends Error {
    readonly status: number
    readonly code?: string
    readonly errors: string[]
    readonly applicationId?: string

    constructor(message: string, status: number, extra: { code?: string; errors?: string[]; application_id?: string } = {}) {
        super(message)
        this.name = "PresetApiError"
        this.status = status
        this.code = extra.code
        this.errors = extra.errors ?? []
        this.applicationId = extra.application_id
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
        throw new PresetApiError(err.message ?? fallback, res.status, err)
    }
    return (await res.json().catch(() => ({}))) as T
}

const json = (body: unknown): RequestInit["body"] => JSON.stringify(body)

// ─── Professor: presets ───────────────────────────────────────────────────────

export async function apiGetPresets(status?: PresetStatus): Promise<PresetSummary[]> {
    const q = status ? `?status=${status}` : ""
    const data = await request<{ presets: PresetSummary[] }>(`/api/presets${q}`, undefined, "Erro ao carregar presets.")
    return data.presets ?? []
}

export async function apiGetPreset(id: string): Promise<PresetDetail> {
    const data = await request<{ preset: PresetDetail }>(`/api/presets/${id}`, undefined, "Preset não encontrado.")
    return data.preset
}

export async function apiCreatePreset(payload: { name: string; description?: string; color?: string }): Promise<PresetSummary> {
    const data = await request<{ preset: PresetSummary }>("/api/presets", { method: "POST", body: json(payload) }, "Erro ao criar preset.")
    return data.preset
}

export async function apiUpdatePreset(id: string, payload: { name?: string; description?: string; color?: string }): Promise<PresetSummary> {
    const data = await request<{ preset: PresetSummary }>(`/api/presets/${id}`, { method: "PATCH", body: json(payload) }, "Erro ao salvar preset.")
    return data.preset
}

export async function apiSavePresetContent(id: string, content: PresetContent): Promise<PresetDetail> {
    const data = await request<{ preset: PresetDetail }>(`/api/presets/${id}/content`, { method: "PUT", body: json(content) }, "Erro ao salvar o conteúdo.")
    return data.preset
}

export async function apiPublishPreset(id: string): Promise<{ id: string; version: number; status: PresetStatus }> {
    const data = await request<{ result: { id: string; version: number; status: PresetStatus } }>(`/api/presets/${id}/publish`, { method: "POST" }, "Erro ao publicar.")
    return data.result
}

export async function apiDuplicatePreset(id: string): Promise<PresetSummary> {
    const data = await request<{ preset: PresetSummary }>(`/api/presets/${id}/duplicate`, { method: "POST" }, "Erro ao duplicar.")
    return data.preset
}

export async function apiArchivePreset(id: string): Promise<PresetSummary> {
    const data = await request<{ preset: PresetSummary }>(`/api/presets/${id}/archive`, { method: "POST" }, "Erro ao arquivar.")
    return data.preset
}

export async function apiDeletePreset(id: string): Promise<void> {
    await request(`/api/presets/${id}`, { method: "DELETE" }, "Erro ao excluir preset.")
}

// ─── Professor: class code and roster ─────────────────────────────────────────

export async function apiGetInviteCode(): Promise<string> {
    const data = await request<{ invite_code: string }>("/api/professor/invite-code", undefined, "Erro ao carregar o código da turma.")
    return data.invite_code
}

export async function apiRotateInviteCode(): Promise<string> {
    const data = await request<{ invite_code: string }>("/api/professor/invite-code/rotate", { method: "POST" }, "Erro ao gerar novo código.")
    return data.invite_code
}

export async function apiGetRoster(): Promise<RosterItem[]> {
    const data = await request<{ students: RosterItem[] }>("/api/professor/students", undefined, "Erro ao carregar alunos.")
    return data.students ?? []
}

export async function apiRemoveStudent(linkId: string): Promise<void> {
    await request(`/api/professor/students/${linkId}`, { method: "DELETE" }, "Erro ao remover aluno.")
}

// ─── Student: linking, classes, applications ──────────────────────────────────

export async function apiJoinProfessor(code: string): Promise<ProfessorLinkItem> {
    const data = await request<{ link: ProfessorLinkItem }>("/api/professor-links", { method: "POST", body: json({ code }) }, "Código de turma inválido.")
    return data.link
}

export async function apiGetProfessorLinks(): Promise<ProfessorLinkItem[]> {
    const data = await request<{ links: ProfessorLinkItem[] }>("/api/professor-links", undefined, "Erro ao carregar professores.")
    return data.links ?? []
}

export async function apiLeaveProfessor(linkId: string): Promise<void> {
    await request(`/api/professor-links/${linkId}`, { method: "DELETE" }, "Erro ao desvincular.")
}

export async function apiGetClasses(): Promise<ClassSummary[]> {
    const data = await request<{ classes: ClassSummary[] }>("/api/classes", undefined, "Erro ao carregar turmas.")
    return data.classes ?? []
}

export async function apiGetClassPreview(id: string): Promise<ClassPreview> {
    const data = await request<{ preview: ClassPreview }>(`/api/classes/${id}/preview`, undefined, "Turma não encontrada.")
    return data.preview
}

export async function apiApplyClass(id: string, subjectName?: string): Promise<ApplyResult> {
    const data = await request<{ result: ApplyResult }>(
        `/api/classes/${id}/apply`,
        { method: "POST", body: json(subjectName ? { subject_name: subjectName } : {}) },
        "Erro ao aplicar a turma.",
    )
    return data.result
}

export async function apiGetAppliedClasses(): Promise<AppliedClass[]> {
    const data = await request<{ applications: AppliedClass[] }>("/api/preset-applications", undefined, "Erro ao carregar suas turmas.")
    return data.applications ?? []
}

export async function apiRemoveApplication(id: string, mode: "detach" | "delete"): Promise<RemoveResult> {
    const data = await request<{ result: RemoveResult }>(`/api/preset-applications/${id}?mode=${mode}`, { method: "DELETE" }, "Erro ao remover a turma.")
    return data.result
}

// ─── Versions: diff and merge (student) ───────────────────────────────────────

export type FieldValue = string | number | boolean | null | string[]

export interface FieldChange {
    field: string
    base: FieldValue
    theirs: FieldValue
    mine: FieldValue
    /** `auto`: the student left it as delivered. `conflict`: the student changed it too. */
    resolution: "auto" | "conflict"
}

export interface EntityDiff {
    added: { key: string; label: string; fields: Record<string, FieldValue> }[]
    removed: { key: string; id: string; label: string; has_progress: boolean }[]
    changed: { key: string; id: string; label: string; fields: FieldChange[] }[]
}

export interface PresetDiff {
    application_id: string
    from_version: number
    to_version: number
    up_to_date: boolean
    topics: EntityDiff
    exams: EntityDiff
    tasks: EntityDiff
    counts: { added: number; removed: number; changed: number }
}

export interface MergePayload {
    toVersion: number
    acceptAdded?: string[]
    remove?: string[]
    fieldChoices?: Record<string, Record<string, "theirs" | "mine">>
}

export interface MergeResult {
    application_id: string
    from_version: number
    to_version: number
    created: { topics: number; exams: number; tasks: number }
    updated: { topics: number; exams: number; tasks: number }
    removed: { topics: number; exams: number; tasks: number }
    kept: { topics: number; exams: number; tasks: number }
    skipped: { kind: "topic" | "exam" | "task"; title: string; reason: string }[]
    schedules: { exam_id: string; generated: boolean; reason?: string }[]
}

export async function apiGetPresetDiff(applicationId: string): Promise<PresetDiff> {
    const data = await request<{ diff: PresetDiff }>(`/api/preset-applications/${applicationId}/diff`, undefined, "Erro ao carregar as mudanças.")
    return data.diff
}

export async function apiMergePreset(applicationId: string, payload: MergePayload): Promise<MergeResult> {
    const data = await request<{ result: MergeResult }>(
        `/api/preset-applications/${applicationId}/merge`,
        { method: "POST", body: json(payload) },
        "Erro ao aplicar a atualização.",
    )
    return data.result
}

// ─── Insights (professor) ─────────────────────────────────────────────────────

export interface TopicMetrics {
    completed_pct: number
    studied_pct: number
    avg_retention: number | null
    session_completion: number | null
    sessions: { total: number; completed: number; skipped: number }
    flashcard_accuracy: number | null
    reviews: number
}

export interface InsightTopic extends TopicMetrics {
    key: string
    name: string
    students: number
}

export interface PresetInsights {
    preset_id: string
    name: string
    version: number
    applied_count: number
    min_cohort: number
    hidden: boolean
    topics: InsightTopic[]
}

export interface AppliedStudent {
    student_id: string
    name: string
    applied_at: string
    version_applied: number
}

export interface StudentProgress {
    student: { id: string; name: string }
    applied_at: string
    version_applied: number
    topics: (TopicMetrics & { key: string; name: string; is_completed: boolean })[]
}

export async function apiGetPresetInsights(id: string): Promise<PresetInsights> {
    const data = await request<{ insights: PresetInsights }>(`/api/presets/${id}/insights`, undefined, "Erro ao carregar o progresso.")
    return data.insights
}

export async function apiGetAppliedStudents(id: string): Promise<AppliedStudent[]> {
    const data = await request<{ students: AppliedStudent[] }>(`/api/presets/${id}/students`, undefined, "Erro ao carregar os alunos.")
    return data.students ?? []
}

export async function apiGetStudentProgress(id: string, studentId: string): Promise<StudentProgress> {
    const data = await request<{ student: StudentProgress }>(`/api/presets/${id}/students/${studentId}`, undefined, "Aluno não encontrado.")
    return data.student
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function apiSetUserRole(userId: string, role: "USER" | "PROFESSOR"): Promise<void> {
    await request(`/api/admin/users/${userId}/role`, { method: "PATCH", body: json({ role }) }, "Erro ao alterar o papel.")
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const WEIGHT_LABEL: Record<TopicWeight, string> = {
    essential: "Essencial",
    review: "Revisão",
    optional: "Opcional",
}

export const STATUS_LABEL: Record<PresetStatus, string> = {
    draft: "Rascunho",
    published: "Publicado",
    archived: "Arquivado",
}
