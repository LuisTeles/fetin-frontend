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

// Study preferences (D4): GET/PATCH /users/me/settings on the backend. The access token stays
// server-side, like every other route handler.

async function callSettings(accessToken: string, method: "GET" | "PATCH", body?: unknown) {
    return forwardToBackend("/users/me/settings", {
        method,
        headers: { Authorization: `Bearer ${accessToken}` },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
}

async function handle(method: "GET" | "PATCH", body?: unknown) {
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessão expirada. Faça login novamente.")
    }

    let response = await callSettings(accessToken, method, body)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }
        response = await callSettings(refreshed.accessToken, method, body)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const data = await safeJson<Record<string, unknown>>(response)
    return toJsonResponse(data ?? {})
}

export async function GET() {
    return handle("GET")
}

export async function PATCH(request: Request) {
    const body = await request.json().catch(() => ({}))
    return handle("PATCH", body)
}
