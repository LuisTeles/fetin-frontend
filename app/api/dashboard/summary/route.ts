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

async function fetchSummary(accessToken: string, impersonateUserId?: string | null) {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
    }
    if (impersonateUserId) {
        headers["x-impersonate-user-id"] = impersonateUserId
    }

    return forwardToBackend("/dashboard/summary", {
        method: "GET",
        headers,
    })
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessão expirada. Faça login novamente.")
    }

    let response = await fetchSummary(accessToken, userId)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }
        response = await fetchSummary(refreshed.accessToken, userId)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const data = await safeJson<unknown>(response)
    return toJsonResponse(data as Record<string, unknown>)
}
