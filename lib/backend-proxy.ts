import type { ApiErrorResponse } from "@/lib/auth-types"
import {
    forwardToBackend,
    getAccessTokenFromCookie,
    getMessageFromApiError,
    refreshTokensFromCookie,
    safeJson,
    toJsonResponse,
} from "@/lib/server-auth"

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface ProxyOptions {
    method: Method
    /** Wrap the backend payload as { [wrap]: payload }; omit to pass it through as-is. */
    wrap?: string
    status?: number
    /** Forward the request's query string (minus userId) to the backend. */
    forwardQuery?: boolean
}

/** Backend error bodies can carry more than a message: `code` (NAME_TAKEN, ALREADY_APPLIED…),
 *  `errors[]` (publish validation) and `application_id`. The generic `toJsonError` drops them. */
type BackendError = ApiErrorResponse & { code?: string; errors?: string[]; application_id?: string }

/**
 * One BFF hop for the presets/classes/professor routes: token from the cookie, one
 * refresh-and-retry on 401, and `?userId=` turned into x-impersonate-user-id (read-only).
 * Unlike the flashcards proxy this keeps the structured error fields the screens need.
 */
export async function proxyBackend(request: Request, path: string, options: ProxyOptions) {
    const { method, wrap, status = 200, forwardQuery = false } = options
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")
    const forwarded = new URLSearchParams(url.searchParams)
    forwarded.delete("userId")
    const qs = forwardQuery && forwarded.toString() ? `?${forwarded.toString()}` : ""
    const hasBody = method === "POST" || method === "PUT" || method === "PATCH"
    const body = hasBody ? await request.text() : undefined

    const call = (accessToken: string) => {
        const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
        if (userId) headers["x-impersonate-user-id"] = userId
        return forwardToBackend(`${path}${qs}`, { method, headers, body: body || undefined })
    }

    const accessToken = await getAccessTokenFromCookie()
    if (!accessToken) return Response.json({ message: "Sessão expirada. Faça login novamente." }, { status: 401 })

    let response = await call(accessToken)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) {
            return Response.json({ message: refreshed.error ?? "Sessão expirada." }, { status: 401 })
        }
        response = await call(refreshed.accessToken)
    }

    if (!response.ok) {
        const payload = await safeJson<BackendError>(response)
        return Response.json(
            {
                message: getMessageFromApiError(payload),
                ...(payload?.code ? { code: payload.code } : {}),
                ...(Array.isArray(payload?.errors) ? { errors: payload.errors } : {}),
                ...(payload?.application_id ? { application_id: payload.application_id } : {}),
            },
            { status: response.status },
        )
    }

    const data = await safeJson<Record<string, unknown>>(response)
    return toJsonResponse(wrap ? { [wrap]: data } : (data ?? {}), status)
}

export type IdCtx = { params: Promise<{ id: string }> }
