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

async function fetchSubjects(accessToken: string) {
    return forwardToBackend("/subjects", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
}

async function createSubject(accessToken: string, body: unknown) {
    return forwardToBackend("/subjects", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
    })
}

export async function GET() {
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessao expirada. Faca login novamente.")
    }

    let response = await fetchSubjects(accessToken)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()

        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessao expirada.")
        }

        response = await fetchSubjects(refreshed.accessToken)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const subjects = await safeJson<unknown>(response)
    return toJsonResponse({ subjects })
}

export async function POST(request: Request) {
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessao expirada. Faca login novamente.")
    }

    const body = await request.json()
    let response = await createSubject(accessToken, body)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()

        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessao expirada.")
        }

        response = await createSubject(refreshed.accessToken, body)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const newSubject = await safeJson<unknown>(response)
    return toJsonResponse({ subject: newSubject }, 201)
}
