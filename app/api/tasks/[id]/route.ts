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

async function fetchTask(id: string, accessToken: string) {
    return forwardToBackend(`/tasks/${id}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
}

async function updateTask(id: string, accessToken: string, body: unknown) {
    return forwardToBackend(`/tasks/${id}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
    })
}

async function deleteTask(id: string, accessToken: string) {
    return forwardToBackend(`/tasks/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const accessToken = await getAccessTokenFromCookie()
    if (!accessToken) {
        return toJsonError(401, "Sessão expirada. Faça login novamente.")
    }

    let response = await fetchTask(id, accessToken)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }
        response = await fetchTask(id, refreshed.accessToken)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const task = await safeJson<unknown>(response)
    return toJsonResponse({ task })
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
    let response = await updateTask(id, accessToken, body)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }
        response = await updateTask(id, refreshed.accessToken, body)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const updatedTask = await safeJson<unknown>(response)
    return toJsonResponse({ task: updatedTask })
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

    let response = await deleteTask(id, accessToken)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }
        response = await deleteTask(id, refreshed.accessToken)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const result = await safeJson<unknown>(response)
    return toJsonResponse({ result })
}
