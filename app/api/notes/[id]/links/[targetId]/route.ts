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

async function addLink(accessToken: string, id: string, targetId: string) {
    return forwardToBackend(`/notes/${id}/links/${targetId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
    })
}

async function removeLink(accessToken: string, id: string, targetId: string) {
    return forwardToBackend(`/notes/${id}/links/${targetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
    })
}

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string; targetId: string }> },
) {
    const { id, targetId } = await params
    const accessToken = await getAccessTokenFromCookie()
    if (!accessToken) return toJsonError(401, "Sessão expirada. Faça login novamente.")

    let response = await addLink(accessToken, id, targetId)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        response = await addLink(refreshed.accessToken, id, targetId)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const data = await safeJson<unknown>(response)
    return toJsonResponse({ link: data }, 201)
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string; targetId: string }> },
) {
    const { id, targetId } = await params
    const accessToken = await getAccessTokenFromCookie()
    if (!accessToken) return toJsonError(401, "Sessão expirada. Faça login novamente.")

    let response = await removeLink(accessToken, id, targetId)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        response = await removeLink(refreshed.accessToken, id, targetId)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    return toJsonResponse({ message: "Vínculo removido com sucesso." })
}
