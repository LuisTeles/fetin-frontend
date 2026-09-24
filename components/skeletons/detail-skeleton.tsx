import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Title block + a content card, for single-entity pages (nota, disciplina). */
export function DetailSkeleton({ label = "Carregando…" }: { label?: string }) {
    return (
        <div role="status" aria-label={label} className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-3 w-96 max-w-full" />
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-4 w-40" />
                </CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-11/12" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="mt-4 h-24 w-full" />
                </CardContent>
            </Card>
        </div>
    )
}
