// ─── Types ────────────────────────────────────────────────────────────────────

export interface SparklineKpis {
    totalHoursThisWeek: number
    totalHoursTrend: number[]
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
}

export interface DashboardSummary {
    kpis: SparklineKpis
    heatmapData: HeatmapRow[]
    bulletData: BulletDatum[]
    divergingData: DivergingDatum[]
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
