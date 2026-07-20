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

async function addRoutineBlock(accessToken: string, body: unknown, impersonateUserId?: string | null) {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
    }
    if (impersonateUserId) {
        headers["x-impersonate-user-id"] = impersonateUserId
    }

    return forwardToBackend("/availability/routine", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    })
}

async function syncRoutine(accessToken: string, body: unknown, impersonateUserId?: string | null) {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
    }
    if (impersonateUserId) {
        headers["x-impersonate-user-id"] = impersonateUserId
    }

    return forwardToBackend("/availability/routine/sync", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    })
}

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const action = searchParams.get("action") // "sync" or default single add
    const accessToken = await getAccessTokenFromCookie()

    if (!accessToken) {
        return toJsonError(401, "Sessão expirada. Faça login novamente.")
    }

    const body = await request.json()
    let response = action === "sync"
        ? await syncRoutine(accessToken, body, userId)
        : await addRoutineBlock(accessToken, body, userId)

    if (response.status === 401) {
        const refreshed = await refreshTokensFromCookie()
        if (!refreshed.ok || !refreshed.accessToken) {
            return toJsonError(401, refreshed.error ?? "Sessão expirada.")
        }
        response = action === "sync"
            ? await syncRoutine(refreshed.accessToken, body, userId)
            : await addRoutineBlock(refreshed.accessToken, body, userId)
    }

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const data = await safeJson<Record<string, unknown>>(response)
    return toJsonResponse(data ?? {}, 201)
}
