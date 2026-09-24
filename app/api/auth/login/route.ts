import type { ApiErrorResponse, AuthSuccessResponse } from "@/lib/auth-types"
import {
    extractBackendRefreshToken,
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
        return toJsonError(502, "Resposta inválida do backend.")
    }

    // The refresh token arrives only as a Set-Cookie on the backend response.
    const refreshToken = extractBackendRefreshToken(response)

    if (!refreshToken) {
        return toJsonError(502, "Backend não retornou o cookie de refresh.")
    }

    await writeAuthCookies(payload.tokens, refreshToken)

    return toJsonResponse({
        message: payload.message,
        user: payload.user,
    })
}
