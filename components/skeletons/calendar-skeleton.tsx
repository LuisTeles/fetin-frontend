import { Skeleton } from "@/components/ui/skeleton"

/** Month grid: weekday header + 5 rows of 7 cells. */
export function CalendarSkeleton() {
    return (
        <div role="status" aria-label="Carregando compromissos" className="space-y-1">
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
            </div>
        </div>
    )
}
