import type { ApiErrorResponse, AuthSuccessResponse } from "@/lib/auth-types"
import {
    forwardToBackend,
    getMessageFromApiError,
    safeJson,
    toJsonError,
    toJsonResponse,
    writeAuthCookies,
} from "@/lib/server-auth"

export async function POST(request: Request) {
    const body = await request.json()

    const response = await forwardToBackend("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        const payload = await safeJson<ApiErrorResponse>(response)
        return toJsonError(response.status, getMessageFromApiError(payload))
    }

    const payload = await safeJson<AuthSuccessResponse>(response)

    if (!payload?.tokens || !payload?.user) {
        return toJsonError(502, "Resposta invalida do backend.")
    }

    await writeAuthCookies(payload.tokens)

    return toJsonResponse({
        message: payload.message,
        user: payload.user,
    })
}
