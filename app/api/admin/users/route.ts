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

async function fetchAllUsers(accessToken: string) {
    return forwardToBackend("/users", {
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

    let response = await fetchAllUsers(accessToken)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()

        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessao expirada.")
        }

        response = await fetchAllUsers(refreshed.accessToken)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const users = await safeJson<unknown>(response)
    return toJsonResponse({ users })
}
