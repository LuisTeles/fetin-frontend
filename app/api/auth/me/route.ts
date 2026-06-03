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

async function fetchProfile(accessToken: string) {
    return forwardToBackend("/users/me", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
}

export async function GET() {
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessao expirada. Faca login novamente.")
    }

    let response = await fetchProfile(accessToken)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()

        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessao expirada.")
        }

        response = await fetchProfile(refreshed.accessToken)
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
