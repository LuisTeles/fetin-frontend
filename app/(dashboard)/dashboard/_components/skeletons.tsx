import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Suspense fallbacks, one per widget.
 *
 * These were a single monolithic `DashboardSkeleton` covering the whole page, which only
 * worked because the page blocked on one fetch. Split per widget so each Suspense boundary
 * has a fallback the exact shape of what it replaces — no layout shift when it resolves.
 */

export function KpiRowSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="p-4 pb-0">
                        <Skeleton className="h-3 w-24" />
                    </CardHeader>
                    <CardContent className="space-y-2 p-4 pt-2">
                        <Skeleton className="h-7 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export function ChartCardSkeleton({ height = 208 }: { height?: number }) {
    return (
        <Card>
            <CardHeader className="border-b border-border/40 p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-1 h-3 w-64" />
            </CardHeader>
            <CardContent className="p-4">
                <Skeleton className="w-full" style={{ height }} />
            </CardContent>
        </Card>
    )
}

export function ChartGridSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <ChartCardSkeleton />
            <ChartCardSkeleton />
        </div>
    )
}
