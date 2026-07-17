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

async function updateTopic(id: string, accessToken: string, body: unknown) {
    return forwardToBackend(`/topics/${id}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
    })
}

async function deleteTopic(id: string, accessToken: string) {
    return forwardToBackend(`/topics/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessão expirada. Faça login novamente.")
    }

    const body = await request.json()
    let response = await updateTopic(id, accessToken, body)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()

        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }

        response = await updateTopic(id, refreshed.accessToken, body)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const updatedTopic = await safeJson<unknown>(response)
    return toJsonResponse({ topic: updatedTopic })
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessão expirada. Faça login novamente.")
    }

    let response = await deleteTopic(id, accessToken)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()

        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }

        response = await deleteTopic(id, refreshed.accessToken)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const result = await safeJson<unknown>(response)
    return toJsonResponse({ result })
}
