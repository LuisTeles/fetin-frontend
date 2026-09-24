"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"
import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * The backend rotates the refresh token on every use and stores only the latest hash
 * (see AuthService.refresh), so it is single-use: two concurrent requests with the same
 * token race, and only the first to land wins — the rest 401 as if the session were
 * genuinely dead. The dashboard mounts one `<SessionExpired>` per widget behind independent
 * Suspense boundaries, so all of them see the stale token at once. This module-level
 * promise makes every instance await the *same* in-flight refresh instead of firing one
 * each, and clears itself once settled so a later, real expiry still triggers a fresh call.
 */
let sharedRenewal: Promise<boolean> | null = null

function renewSharedSession(): Promise<boolean> {
    if (!sharedRenewal) {
        sharedRenewal = fetch("/api/auth/refresh", { method: "POST" })
            .then((response) => response.ok)
            .catch(() => false)
            .finally(() => {
                sharedRenewal = null
            })
    }
    return sharedRenewal
}

/**
 * Renewal affordance for a stale session.
 *
 * A Server Component cannot refresh the session itself — `refreshTokensFromCookie()` writes
 * cookies, and React only allows that from Route Handlers and Server Actions. So the RSC
 * reports `sessionExpired` and this Client Component performs the renewal against
 * `POST /api/auth/refresh`, then re-runs the server render via `router.refresh()`.
 *
 * The access-token cookie is short-lived (15m) by design, so every widget on this page hits
 * this state on a routine basis — not just after a real, week-long absence. Renewing
 * automatically on mount keeps that routine case invisible; the manual button stays only as
 * a fallback for when auto-renewal itself fails (e.g. the 7-day refresh token is genuinely
 * gone), and as a retry after a transient network error.
 */
export function SessionExpired() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [failed, setFailed] = useState(false)
    const attempted = useRef(false)

    async function renew() {
        setFailed(false)
        const ok = await renewSharedSession()

        if (!ok) {
            // The refresh token is gone or rejected — only a fresh login recovers this.
            router.push("/login")
            setFailed(true)
            return
        }

        startTransition(() => router.refresh())
    }

    useEffect(() => {
        if (attempted.current) return
        attempted.current = true
        void renew()
    }, [])

    return (
        <div
            role="status"
            aria-live="polite"
            className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm"
        >
            <AlertCircle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span className="text-foreground">
                {failed
                    ? "Sua sessão expirou. Entre novamente para continuar."
                    : "Renovando sua sessão..."}
            </span>
            {failed && (
                <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-7 text-xs"
                    onClick={renew}
                    disabled={isPending}
                >
                    {isPending ? "Renovando…" : "Tentar novamente"}
                </Button>
            )}
        </div>
    )
}
