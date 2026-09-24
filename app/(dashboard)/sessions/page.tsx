import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { SessionAgenda } from "@/components/sessions/session-agenda"

export default function SessionsPage() {
    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
                <h1 className="page-title">Sessões</h1>
                <p className="text-xs text-muted-foreground">
                    O que estudar agora e quais provas vêm pela frente, num só lugar.
                </p>
            </div>
            {/* useSearchParams (impersonation) needs a Suspense boundary in a server page */}
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <SessionAgenda />
            </Suspense>
        </section>
    )
}
