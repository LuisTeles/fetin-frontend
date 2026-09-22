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

async function fetchTags(accessToken: string, impersonateUserId?: string | null) {
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
    if (impersonateUserId) {
        headers["x-impersonate-user-id"] = impersonateUserId
    }
    return forwardToBackend("/tags", { method: "GET", headers })
}

async function createTag(accessToken: string, body: unknown) {
    return forwardToBackend("/tags", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
    })
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    const accessToken = await getAccessTokenFromCookie()
    if (!accessToken) return toJsonError(401, "Sessão expirada. Faça login novamente.")

    let response = await fetchTags(accessToken, userId)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        response = await fetchTags(refreshed.accessToken, userId)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const tags = await safeJson<unknown>(response)
    return toJsonResponse({ tags })
}

export async function POST(request: Request) {
    const accessToken = await getAccessTokenFromCookie()
    if (!accessToken) return toJsonError(401, "Sessão expirada. Faça login novamente.")

    const body = await request.json()
    let response = await createTag(accessToken, body)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        response = await createTag(refreshed.accessToken, body)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const tag = await safeJson<unknown>(response)
    return toJsonResponse({ tag }, 201)
}
