import { Suspense } from "react"
import { cookies } from "next/headers"

import { parseRange } from "@/lib/dashboard-range"
import { LAYOUT_COOKIE, parseLayout, visibleSections, type SectionId } from "@/lib/dashboard-layout"
import { DashboardLayoutProvider } from "./_components/dashboard-layout-provider"
import { DashboardSection } from "./_components/dashboard-section"
import { DashboardToolbar } from "./_components/dashboard-toolbar"
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
    const curveScope = params.curves === "all" ? "all" : "upcoming"

    // Layout preferences live in a cookie so the server can skip hidden sections entirely:
    // a hidden widget is neither rendered nor fetched.
    const layout = parseLayout((await cookies()).get(LAYOUT_COOKIE)?.value)
    const shown = new Set<SectionId>(visibleSections(layout))
    const has = (id: SectionId) => shown.has(id)

    return (
        <DashboardLayoutProvider initial={layout}>
            <section className="space-y-6">
                <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-4">
                    <div className="min-w-0">
                        <h1 className="page-title text-balance">
                            Diagnóstico de Estudos
                        </h1>
                        <p className="text-pretty text-xs text-muted-foreground">
                            Visualize padrões de burnout, cronogramas negligenciados e tendências de
                            desempenho.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <DashboardToolbar />
                        <RefreshButton />
                    </div>
                </div>

                {shown.size === 0 && (
                    <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        Todas as seções estão ocultas. Abra <strong>Personalizar</strong> para escolher o que ver.
                    </p>
                )}

                {/* Every widget states its own fixed window; only Aderência has a selector (in its card). */}
                {has("kpis") && (
                    <DashboardSection id="kpis">
                        <Suspense fallback={<KpiRowSkeleton />}>
                            <KpiWidget userId={userId} />
                        </Suspense>
                    </DashboardSection>
                )}

                {/* Predictive first: what happens next outranks what already happened. */}
                {has("readiness") && (
                    <DashboardSection id="readiness">
                        <Suspense fallback={<ChartGridSkeleton />}>
                            <ReadinessWidget userId={userId} />
                        </Suspense>
                    </DashboardSection>
                )}

                {has("queue") && (
                    <DashboardSection id="queue">
                        <Suspense fallback={<ChartCardSkeleton height={320} />}>
                            <StudyQueueWidget userId={userId} />
                        </Suspense>
                    </DashboardSection>
                )}

                {/* Diagnostic: why the plan keeps failing. */}
                {has("adherence") && (
                    <DashboardSection id="adherence">
                        <Suspense key={`${range}`} fallback={<ChartCardSkeleton height={420} />}>
                            <AdherenceWidget userId={userId} range={range} />
                        </Suspense>
                    </DashboardSection>
                )}

                {/* The product's premise, made visible. */}
                {has("curve") && (
                    <DashboardSection id="curve">
                        <Suspense key={curveScope} fallback={<ChartCardSkeleton height={360} />}>
                            <RetentionCurveWidget userId={userId} scope={curveScope} />
                        </Suspense>
                    </DashboardSection>
                )}

                {has("effectiveness") && (
                    <DashboardSection id="effectiveness">
                        <Suspense fallback={<ChartCardSkeleton height={240} />}>
                            <EffectivenessWidget userId={userId} />
                        </Suspense>
                    </DashboardSection>
                )}

                {has("heatmap") && (
                    <DashboardSection id="heatmap">
                        <Suspense fallback={<ChartCardSkeleton height={288} />}>
                            <HeatmapWidget userId={userId} />
                        </Suspense>
                    </DashboardSection>
                )}

                {(has("progress") || has("diverging")) && (
                    <Suspense fallback={<ChartGridSkeleton />}>
                        <ProgressWidgets
                            userId={userId}
                            show={{ progress: has("progress"), diverging: has("diverging") }}
                        />
                    </Suspense>
                )}
            </section>
        </DashboardLayoutProvider>
    )
}
