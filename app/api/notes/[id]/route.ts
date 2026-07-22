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

async function fetchNote(accessToken: string, id: string) {
    return forwardToBackend(`/notes/${id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
    })
}

async function patchNote(accessToken: string, id: string, body: unknown) {
    return forwardToBackend(`/notes/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
    })
}

async function deleteNote(accessToken: string, id: string) {
    return forwardToBackend(`/notes/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
    })
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const accessToken = await getAccessTokenFromCookie()
    if (!accessToken) return toJsonError(401, "Sessão expirada. Faça login novamente.")

    let response = await fetchNote(accessToken, id)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        response = await fetchNote(refreshed.accessToken, id)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const note = await safeJson<unknown>(response)
    return toJsonResponse({ note })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const accessToken = await getAccessTokenFromCookie()
    if (!accessToken) return toJsonError(401, "Sessão expirada. Faça login novamente.")

    const body = await request.json()
    let response = await patchNote(accessToken, id, body)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        response = await patchNote(refreshed.accessToken, id, body)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const note = await safeJson<unknown>(response)
    return toJsonResponse({ note })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const accessToken = await getAccessTokenFromCookie()
    if (!accessToken) return toJsonError(401, "Sessão expirada. Faça login novamente.")

    let response = await deleteNote(accessToken, id)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        response = await deleteNote(refreshed.accessToken, id)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    return toJsonResponse({ message: "Nota excluída com sucesso." })
}
