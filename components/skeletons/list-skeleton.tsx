import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Rows shaped like the subject / exam cards. */
export function ListSkeleton({ rows = 3, label = "Carregando…" }: { rows?: number; label?: string }) {
    return (
        <div role="status" aria-label={label} className="grid gap-3">
            {Array.from({ length: rows }).map((_, i) => (
                <Card key={i}>
                    <CardContent className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="size-9 rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                        <Skeleton className="h-5 w-16" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
