// No `server-only` marker: the package is not a dependency, and importing it just for
// this guard would add one. The protection already exists transitively — lib/server-auth
// imports `next/headers`, which throws if this module is ever pulled into client code.
import { cache } from "react"

import type { ApiErrorResponse } from "@/lib/auth-types"
import {
    forwardToBackend,
    getAccessTokenFromCookie,
    getMessageFromApiError,
    safeJson,
} from "@/lib/server-auth"

/**
 * Read path for Server Components.
 *
 * Deliberately NOT `refreshTokensFromCookie()`. That helper calls `cookieStore.set` and
 * `cookieStore.delete`, which throw inside a Server Component — React only permits cookie
 * mutation from Route Handlers and Server Actions. An RSC therefore cannot renew a stale
 * session; it can only report that the session is stale and let a Client Component drive
 * the renewal through `POST /api/auth/refresh`, which runs in a context that may write.
 *
 * Getting this wrong produces a runtime crash that reads like an RSC bug and isn't, so the
 * separation is enforced here rather than left to each caller.
 */

export type AnalyticsResult<T> =
    | { ok: true; data: T }
    | { ok: false; sessionExpired: true }
    | { ok: false; sessionExpired: false; error: string }

async function fetchAnalytics<T>(
    path: string,
    impersonateUserId?: string | null,
): Promise<AnalyticsResult<T>> {
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return { ok: false, sessionExpired: true }
    }

    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
    if (impersonateUserId) {
        headers["x-impersonate-user-id"] = impersonateUserId
    }

    let response: Response
    try {
        response = await forwardToBackend(path, { method: "GET", headers })
    } catch {
        return {
            ok: false,
            sessionExpired: false,
            error: "Não foi possível contatar a API. Verifique se o backend está no ar.",
        }
    }

    if (response.status === 401) {
        // The token expired. Renewal has to happen client-side — see the note above.
        return { ok: false, sessionExpired: true }
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return { ok: false, sessionExpired: false, error: getMessageFromApiError(payload) }
    }

    const data = await safeJson<T>(response)

    if (data === null) {
        return { ok: false, sessionExpired: false, error: "Resposta inválida da API." }
    }

    return { ok: true, data }
}

/**
 * Per-request memoised read. Two widgets asking for the same path in one render pass
 * share a single call, so parallel Suspense boundaries do not multiply requests.
 */
export const getAnalytics = cache(fetchAnalytics)
