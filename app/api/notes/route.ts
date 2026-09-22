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

async function fetchNotes(
    accessToken: string,
    queryString: string,
    impersonateUserId?: string | null
) {
    const path = queryString ? `/notes?${queryString}` : "/notes"
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
    if (impersonateUserId) {
        headers["x-impersonate-user-id"] = impersonateUserId
    }
    return forwardToBackend(path, { method: "GET", headers })
}

async function createNote(accessToken: string, body: unknown) {
    return forwardToBackend("/notes", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
    })
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    // userId drives impersonation and is not part of QueryNoteDto. Forwarding it
    // as a query param trips forbidNonWhitelisted and 400s the whole notes page.
    const userId = searchParams.get("userId")
    const forwarded = new URLSearchParams(searchParams)
    forwarded.delete("userId")
    const queryString = forwarded.toString()

    const accessToken = await getAccessTokenFromCookie()
    if (!accessToken) return toJsonError(401, "Sessão expirada. Faça login novamente.")

    let response = await fetchNotes(accessToken, queryString, userId)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        response = await fetchNotes(refreshed.accessToken, queryString, userId)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const notes = await safeJson<unknown>(response)
    return toJsonResponse({ notes })
}

export async function POST(request: Request) {
    const accessToken = await getAccessTokenFromCookie()
    if (!accessToken) return toJsonError(401, "Sessão expirada. Faça login novamente.")

    const body = await request.json()
    let response = await createNote(accessToken, body)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        response = await createNote(refreshed.accessToken, body)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const note = await safeJson<unknown>(response)
    return toJsonResponse({ note }, 201)
}
