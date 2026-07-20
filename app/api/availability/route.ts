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

async function fetchAvailability(accessToken: string, impersonateUserId?: string | null) {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
    }
    if (impersonateUserId) {
        headers["x-impersonate-user-id"] = impersonateUserId
    }

    return forwardToBackend("/availability", {
        method: "GET",
        headers,
    })
}

async function recalculateAvailability(accessToken: string, impersonateUserId?: string | null) {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
    }
    if (impersonateUserId) {
        headers["x-impersonate-user-id"] = impersonateUserId
    }

    return forwardToBackend("/availability/recalculate", {
        method: "POST",
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

    let response = await fetchAvailability(accessToken, userId)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }
        response = await fetchAvailability(refreshed.accessToken, userId)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const data = await safeJson<Record<string, unknown>>(response)
    return toJsonResponse(data ?? {})
}

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessão expirada. Faça login novamente.")
    }

    let response = await recalculateAvailability(accessToken, userId)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }
        response = await recalculateAvailability(refreshed.accessToken, userId)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const data = await safeJson<Record<string, unknown>>(response)
    return toJsonResponse(data ?? {})
}
