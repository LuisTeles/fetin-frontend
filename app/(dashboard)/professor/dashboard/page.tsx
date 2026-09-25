import { Suspense } from "react"

import { ChartCardSkeleton, KpiRowSkeleton } from "@/app/(dashboard)/dashboard/_components/skeletons"
import { OverviewWidget, RetentionWidgets, StudentsWidget, WeakTopicsWidget } from "./_widgets"

/**
 * The class dashboard (RN-DASH-*): the shell paints at once and every section streams in behind
 * its own Suspense boundary. Reads go through `getAnalytics`, which reports a stale session
 * instead of throwing (a Server Component cannot rewrite cookies).
 */
export const dynamic = "force-dynamic"

export default function ProfessorDashboardPage() {
    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
                <h1 className="page-title">Painel da turma</h1>
                <p className="text-xs text-muted-foreground">
                    Como está o estudo de todos os alunos vinculados a você: retenção, adesão e onde a turma precisa de reforço.
                </p>
            </div>

            <Suspense fallback={<KpiRowSkeleton />}>
                <OverviewWidget />
            </Suspense>
            <Suspense fallback={<div className="grid gap-4 lg:grid-cols-2"><ChartCardSkeleton height={200} /><ChartCardSkeleton height={256} /></div>}>
                <RetentionWidgets />
            </Suspense>
            <Suspense fallback={<ChartCardSkeleton height={240} />}>
                <WeakTopicsWidget />
            </Suspense>
            <Suspense fallback={<ChartCardSkeleton height={200} />}>
                <StudentsWidget />
            </Suspense>
        </section>
    )
}
