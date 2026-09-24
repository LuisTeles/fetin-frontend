import { Skeleton } from "@/components/ui/skeleton"

/** Grid of note cards. */
export function NotesSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div
            role="status"
            aria-label="Carregando notas"
            className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-lg border border-border bg-card p-3.5">
                    <Skeleton className="h-3.5 w-3/5" />
                    <Skeleton className="h-2.5 w-2/5" />
                    <div className="space-y-1.5 pt-1">
                        <Skeleton className="h-2.5 w-full" />
                        <Skeleton className="h-2.5 w-11/12" />
                        <Skeleton className="h-2.5 w-2/3" />
                    </div>
                </div>
            ))}
        </div>
    )
}
