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

async function updateRoutineBlock(accessToken: string, id: string, body: unknown, impersonateUserId?: string | null) {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
    }
    if (impersonateUserId) {
        headers["x-impersonate-user-id"] = impersonateUserId
    }

    return forwardToBackend(`/availability/routine/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
    })
}

async function deleteRoutineBlock(accessToken: string, id: string, impersonateUserId?: string | null) {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
    }
    if (impersonateUserId) {
        headers["x-impersonate-user-id"] = impersonateUserId
    }

    return forwardToBackend(`/availability/routine/${id}`, {
        method: "DELETE",
        headers,
    })
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessão expirada. Faça login novamente.")
    }

    const body = await request.json()
    let response = await updateRoutineBlock(accessToken, id, body, userId)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }
        response = await updateRoutineBlock(refreshed.accessToken, id, body, userId)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const data = await safeJson<Record<string, unknown>>(response)
    return toJsonResponse(data ?? {})
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessão expirada. Faça login novamente.")
    }

    let response = await deleteRoutineBlock(accessToken, id, userId)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }
        response = await deleteRoutineBlock(refreshed.accessToken, id, userId)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const data = await safeJson<Record<string, unknown>>(response)
    return toJsonResponse(data ?? {})
}
