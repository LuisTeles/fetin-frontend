import type { ApiErrorResponse } from "@/lib/auth-types"
import {
    forwardToBackend,
    getAccessTokenFromCookie,
    getMessageFromApiError,
    refreshTokensFromCookie,
    safeJson,
    toJsonError,
    toJsonResponse,
} from "@/lib/server-auth"

type Method = "GET" | "POST" | "PATCH" | "DELETE"

interface ProxyOptions {
    method: Method
    /** Wrap the backend payload as { [wrap]: payload }; omit to pass it through as-is. */
    wrap?: string
    status?: number
    /** Forward the request's query string (minus userId) to the backend. */
    forwardQuery?: boolean
}

/**
 * One BFF hop for every flashcard route: token from the cookie, one refresh-and-retry on
 * 401, and `?userId=` turned into x-impersonate-user-id. userId is stripped from the
 * forwarded query because the backend DTOs forbid unknown params.
 */
export async function proxyFlashcards(request: Request, path: string, options: ProxyOptions) {
    const { method, wrap, status = 200, forwardQuery = false } = options
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")
    const forwarded = new URLSearchParams(url.searchParams)
    forwarded.delete("userId")
    const qs = forwardQuery && forwarded.toString() ? `?${forwarded.toString()}` : ""
    const body = method === "POST" || method === "PATCH" ? await request.text() : undefined

    const call = (accessToken: string) => {
        const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
        if (userId) headers["x-impersonate-user-id"] = userId
        return forwardToBackend(`${path}${qs}`, { method, headers, body: body || undefined })
    }

    const accessToken = await getAccessTokenFromCookie()
    if (!accessToken) return toJsonError(401, "Sessão expirada. Faça login novamente.")

    let response = await call(accessToken)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        response = await call(refreshed.accessToken)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const data = await safeJson<Record<string, unknown>>(response)
    return toJsonResponse(wrap ? { [wrap]: data } : (data ?? {}), status)
}
