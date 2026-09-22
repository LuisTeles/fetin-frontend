import { Suspense } from "react"

import { parseRange } from "@/lib/dashboard-range"
import { RangeFilter } from "./_components/range-filter"
import { RefreshButton } from "./_components/refresh-button"
import {
    ChartCardSkeleton,
    ChartGridSkeleton,
    KpiRowSkeleton,
} from "./_components/skeletons"
import {
    AdherenceWidget,
    EffectivenessWidget,
    HeatmapWidget,
    KpiWidget,
    ProgressWidgets,
    ReadinessWidget,
    RetentionCurveWidget,
    StudyQueueWidget,
} from "./_components/widgets"

/**
 * Server Component.
 *
 * Was a `"use client"` page fetching everything in one `useEffect`, so nothing painted
 * until the slowest query returned and the whole Nivo bundle shipped up front. Now the
 * shell renders immediately, each widget streams into its own Suspense boundary, and the
 * charts arrive as separate chunks (see `charts/lazy-charts.tsx`).
 *
 * `searchParams` is a Promise in Next 15+ and must be awaited — it carries the `?userId=`
 * admin impersonation the old page read with `useSearchParams`, and is where future
 * filters belong so diagnostic views stay shareable.
 */

// Session data is per-request and must never be cached across users.
export const dynamic = "force-dynamic"

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const rawUserId = params.userId
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId
    const range = parseRange(params.range)

    return (
        <section className="space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-4">
                <div className="min-w-0">
                    <h1 className="text-balance text-xl font-bold tracking-tight text-foreground">
                        Diagnóstico de Estudos
                    </h1>
                    <p className="text-pretty text-xs text-muted-foreground">
                        Visualize padrões de burnout, cronogramas negligenciados e tendências de
                        desempenho.
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <RangeFilter />
                    <RefreshButton />
                </div>
            </div>

            <Suspense fallback={<KpiRowSkeleton />}>
                <KpiWidget userId={userId} />
            </Suspense>

            {/* Predictive first: what happens next outranks what already happened. */}
            <Suspense fallback={<ChartGridSkeleton />}>
                <ReadinessWidget userId={userId} />
            </Suspense>

            <Suspense fallback={<ChartCardSkeleton height={320} />}>
                <StudyQueueWidget userId={userId} />
            </Suspense>

            {/* Diagnostic: why the plan keeps failing. */}
            <Suspense key={range} fallback={<ChartCardSkeleton height={420} />}>
                <AdherenceWidget userId={userId} range={range} />
            </Suspense>

            {/* The product's premise, made visible. */}
            <Suspense fallback={<ChartCardSkeleton height={360} />}>
                <RetentionCurveWidget userId={userId} />
            </Suspense>

            <Suspense fallback={<ChartCardSkeleton height={240} />}>
                <EffectivenessWidget userId={userId} />
            </Suspense>

            <Suspense fallback={<ChartCardSkeleton height={288} />}>
                <HeatmapWidget userId={userId} />
            </Suspense>

            <Suspense fallback={<ChartGridSkeleton />}>
                <ProgressWidgets userId={userId} />
            </Suspense>
        </section>
    )
}
