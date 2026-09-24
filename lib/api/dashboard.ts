// ─── Types ────────────────────────────────────────────────────────────────────

export interface SparklineKpis {
    totalHoursThisWeek: number
    totalHoursTrend: number[]
    /** Last 3 CLOSED days vs the 3 before (today excluded); the baseline is shown in the tooltip. */
    hoursComparison: { recentHours: number; baselineHours: number; deltaPct: number | null }
    /** "Dias com estudo": days with a completed session ÷ 7 (was mislabelled "Taxa de conclusão"). */
    sessionCompletionRate: number
    completionRateTrend: number[]
    sessionsCompletedThisWeek: number
    sessionsCompletedTrend: number[]
    currentStreak: number
    streakTrend: number[]
}

export interface HeatmapRow {
    id: string
    data: { x: string; y: number }[]
}

export interface BulletDatum {
    id: string
    subjectId: string
    /** Sessions done / planned in the subject's active plans, from study_sessions. */
    completed: number
    planned: number
    ranges: [number, number, number]
    measures: [number]
    markers: [number]
}

export interface DivergingDatum {
    date: string
    label: string
    delta: number
    completed: number
    planned: number
    /** Today: the day is not over, so the delta is not a failure. */
    inProgress: boolean
}

export interface RetentionDatum {
    topicId: string
    topicName: string
    subjectName: string
    /** 0–1, computed at read time as R = e^(-t/S) — never the stored column. */
    retentionScore: number
    reviewIntervalDays: number
    lastStudiedAt: string | null
    nextReviewAt: string | null
    isDue: boolean
}

export interface RetentionSummary {
    /** Sorted weakest-first: this list is a study queue, not a report. */
    topics: RetentionDatum[]
    dueCount: number
    averageRetention: number
}

export interface DashboardSummary {
    kpis: SparklineKpis
    heatmapData: HeatmapRow[]
    bulletData: BulletDatum[]
    divergingData: DivergingDatum[]
    retention: RetentionSummary
}

// ─── API Call ─────────────────────────────────────────────────────────────────

export async function fetchDashboardSummary(
    impersonateUserId?: string | null,
): Promise<DashboardSummary> {
    const url = impersonateUserId
        ? `/api/dashboard/summary?userId=${impersonateUserId}`
        : '/api/dashboard/summary'

    const res = await fetch(url, { cache: 'no-store' })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Falha ao carregar dados do dashboard.')
    }

    return res.json()
}
