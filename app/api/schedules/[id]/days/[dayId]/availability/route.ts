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

async function toggleDayAvailabilityBackend(accessToken: string, id: string, dayId: string, body: unknown, impersonateUserId?: string | null) {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
    }
    if (impersonateUserId) {
        headers["x-impersonate-user-id"] = impersonateUserId
    }

    return forwardToBackend(`/schedules/${id}/days/${dayId}/availability`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
    })
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string; dayId: string }> }
) {
    const { id, dayId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessão expirada. Faça login novamente.")
    }

    const body = await request.json()
    let response = await toggleDayAvailabilityBackend(accessToken, id, dayId, body, userId)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }
        response = await toggleDayAvailabilityBackend(refreshed.accessToken, id, dayId, body, userId)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const data = await safeJson<Record<string, unknown>>(response)
    return toJsonResponse(data ?? {})
}
