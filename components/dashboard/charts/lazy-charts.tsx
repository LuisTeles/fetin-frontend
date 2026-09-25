"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Lazy boundaries for every Nivo chart.
 *
 * Nivo compiles into a single ~388 KB chunk — the largest in the client bundle. Imported
 * statically it shipped with the dashboard route whether or not a chart was ever painted.
 * Routing every chart through `next/dynamic` means that chunk is fetched when a chart
 * actually renders, so the first paint carries layout and copy only.
 *
 * `ssr: false` is legal here and nowhere else: this module is a Client Component, and
 * Next forbids the flag inside Server Components. Keeping the boundary in one file is
 * what keeps the page itself a Server Component.
 */

function ChartFallback({ height }: { height: number }) {
    return <Skeleton className="w-full" style={{ height }} aria-hidden="true" />
}

export const ActivityHeatmap = dynamic(
    () => import("../activity-heatmap").then((m) => m.ActivityHeatmap),
    { ssr: false, loading: () => <ChartFallback height={288} /> },
)

export const BulletChart = dynamic(
    () => import("../bullet-chart").then((m) => m.BulletChart),
    { ssr: false, loading: () => <ChartFallback height={208} /> },
)

export const DivergingBars = dynamic(
    () => import("../diverging-bars").then((m) => m.DivergingBars),
    { ssr: false, loading: () => <ChartFallback height={208} /> },
)

export const SparklineKpiCards = dynamic(
    () => import("../sparkline-kpis").then((m) => m.SparklineKpiCards),
    { ssr: false, loading: () => <ChartFallback height={112} /> },
)

export const RetentionCurveChart = dynamic(
    () => import("@/components/analytics/retention-curve-chart").then((m) => m.RetentionCurveChart),
    { ssr: false, loading: () => <ChartFallback height={288} /> },
)

export const DisciplineRetentionChart = dynamic(
    () => import("@/components/professor/class-charts").then((m) => m.DisciplineRetentionChart),
    { ssr: false, loading: () => <ChartFallback height={200} /> },
)

export const RetentionHistogram = dynamic(
    () => import("@/components/professor/class-charts").then((m) => m.RetentionHistogram),
    { ssr: false, loading: () => <ChartFallback height={256} /> },
)

export const WeakTopicsChart = dynamic(
    () => import("@/components/professor/class-charts").then((m) => m.WeakTopicsChart),
    { ssr: false, loading: () => <ChartFallback height={240} /> },
)

export const WeekdayAdherenceChart = dynamic(
    () => import("@/components/professor/class-charts").then((m) => m.WeekdayAdherenceChart),
    { ssr: false, loading: () => <ChartFallback height={224} /> },
)
