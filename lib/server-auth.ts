import { cookies } from "next/headers"

import {
    ACCESS_TOKEN_COOKIE,
    ACCESS_TOKEN_MAX_AGE_SECONDS,
    BACKEND_API_BASE_URL,
    BACKEND_REFRESH_COOKIE,
    REFRESH_TOKEN_COOKIE,
    REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "@/lib/api-config"
import type { ApiErrorResponse, AuthSuccessResponse } from "@/lib/auth-types"

type JsonRecord = Record<string, unknown>

export async function safeJson<T>(response: Response): Promise<T | null> {
    try {
        return (await response.json()) as T
    } catch {
        return null
    }
}

export async function forwardToBackend(
    path: string,
    init: RequestInit = {}
): Promise<Response> {
    return fetch(`${BACKEND_API_BASE_URL}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init.headers ?? {}),
        },
        cache: "no-store",
    })
}

/**
 * The backend never returns refresh_token in the response body — it delivers it
 * only as its own httpOnly `refresh_token` cookie. `fetch` has no cookie jar, so
 * the BFF has to lift the value off Set-Cookie itself and re-store it for the
 * browser under REFRESH_TOKEN_COOKIE.
 */
export function extractBackendRefreshToken(response: Response): string | null {
    const lines = response.headers.getSetCookie?.() ?? []

    for (const line of lines) {
        const [pair] = line.split(";")
        const separator = pair.indexOf("=")
        if (separator === -1) continue
        if (pair.slice(0, separator).trim() !== BACKEND_REFRESH_COOKIE) continue

        const raw = pair.slice(separator + 1).trim()
        if (!raw) return null

        try {
            return decodeURIComponent(raw)
        } catch {
            return raw
        }
    }

    return null
}

export function getMessageFromApiError(payload: ApiErrorResponse | null): string {
    if (!payload) {
        return "Erro inesperado ao comunicar com a API."
    }

    if (Array.isArray(payload.message)) {
        return payload.message.join(" ")
    }

    if (typeof payload.message === "string") {
        return payload.message
    }

    return "Erro inesperado ao comunicar com a API."
}

export async function writeAuthCookies(
    tokens: { access_token: string; expires_in?: number },
    refreshToken: string
) {
    // An empty refresh cookie is how the silent-logout bug hid: writeAuthCookies
    // used to read tokens.refresh_token, which the backend stopped sending, and
    // stored `undefined`. Fail loudly instead of writing a useless cookie.
    if (!refreshToken) {
        throw new Error(
            "writeAuthCookies called without a refresh token — the backend response " +
                "carried no refresh_token cookie."
        )
    }

    const cookieStore = await cookies()
    cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: tokens.expires_in ?? ACCESS_TOKEN_MAX_AGE_SECONDS,
    })

    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    })
}

export async function clearAuthCookies() {
    const cookieStore = await cookies()
    cookieStore.delete(ACCESS_TOKEN_COOKIE)
    cookieStore.delete(REFRESH_TOKEN_COOKIE)
}

export async function refreshTokensFromCookie(): Promise<{
    ok: boolean
    accessToken?: string
    error?: string
}> {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

    if (!refreshToken) {
        return { ok: false, error: "Sessao expirada. Faca login novamente." }
    }

    // AuthController.refresh() reads the token from the Cookie header and ignores
    // the request body, so it has to travel as a cookie.
    const response = await forwardToBackend("/auth/refresh", {
        method: "POST",
        headers: { Cookie: `${BACKEND_REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}` },
    })

    if (!response.ok) {
        await clearAuthCookies()
        const payload = await safeJson<ApiErrorResponse>(response)
        return { ok: false, error: getMessageFromApiError(payload) }
    }

    const payload = await safeJson<AuthSuccessResponse>(response)
    const rotatedToken = extractBackendRefreshToken(response)

    if (!payload?.tokens?.access_token || !rotatedToken) {
        await clearAuthCookies()
        return { ok: false, error: "Resposta de refresh inválida." }
    }

    // The backend rotates the refresh token on every use, so store the new one.
    await writeAuthCookies(payload.tokens, rotatedToken)

    return { ok: true, accessToken: payload.tokens.access_token }
}

export async function getAccessTokenFromCookie(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null
}

export function toJsonError(status: number, message: string) {
    return Response.json({ message }, { status })
}

export function toJsonResponse(payload: JsonRecord, status = 200) {
    return Response.json(payload, { status })
}
