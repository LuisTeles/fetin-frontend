import type { ApiErrorResponse, AuthUser } from "@/lib/auth-types"
import {
    clearAuthCookies,
    forwardToBackend,
    getAccessTokenFromCookie,
    getMessageFromApiError,
    refreshTokensFromCookie,
    safeJson,
    toJsonError,
    toJsonResponse,
} from "@/lib/server-auth"

async function fetchProfile(accessToken: string, impersonateUserId?: string | null) {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
    }
    if (impersonateUserId) {
        headers["x-impersonate-user-id"] = impersonateUserId
    }
    return forwardToBackend("/users/me", {
        method: "GET",
        headers,
    })
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessao expirada. Faca login novamente.")
    }

    let response = await fetchProfile(accessToken, userId)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()

        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessao expirada.")
        }

        response = await fetchProfile(refreshed.accessToken, userId)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const profile = await safeJson<AuthUser>(response)
    return toJsonResponse({ user: profile })
}

export async function DELETE() {
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessao expirada. Faca login novamente.")
    }

    let response = await forwardToBackend("/users/me", {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()

        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessao expirada.")
        }

        response = await forwardToBackend("/users/me", {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${refreshed.accessToken}`,
            },
        })
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    await clearAuthCookies()

    return toJsonResponse({ message: "Conta excluida com sucesso." }, 200)
}
