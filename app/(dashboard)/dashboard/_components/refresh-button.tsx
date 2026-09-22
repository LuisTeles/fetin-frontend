"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Re-runs the server render. Replaces the old client-side `load()` refetch — with data
 * fetched in Server Components, `router.refresh()` is the way to get fresh data.
 *
 * `useTransition` gives the pending state without a `useState`/`useEffect` pair, and keeps
 * the existing UI interactive while the server re-renders.
 */
export function RefreshButton() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    return (
        <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            aria-label="Atualizar dados do painel"
            onClick={() => startTransition(() => router.refresh())}
            disabled={isPending}
        >
            <RefreshCw
                className={`h-3 w-3 ${isPending ? "animate-spin motion-reduce:animate-none" : ""}`}
                aria-hidden="true"
            />
            {isPending ? "Atualizando…" : "Atualizar"}
        </Button>
    )
}
