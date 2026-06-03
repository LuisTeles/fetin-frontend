import { cookies } from "next/headers"

import {
    ACCESS_TOKEN_COOKIE,
    ACCESS_TOKEN_MAX_AGE_SECONDS,
    BACKEND_API_BASE_URL,
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

export async function writeAuthCookies(tokens: {
    access_token: string
    refresh_token: string
    expires_in?: number
}) {
    const cookieStore = await cookies()
    cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: tokens.expires_in ?? ACCESS_TOKEN_MAX_AGE_SECONDS,
    })

    cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
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

    const response = await forwardToBackend("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
        await clearAuthCookies()
        const payload = await safeJson<ApiErrorResponse>(response)
        return { ok: false, error: getMessageFromApiError(payload) }
    }

    const payload = await safeJson<AuthSuccessResponse>(response)

    if (!payload?.tokens?.access_token || !payload.tokens.refresh_token) {
        await clearAuthCookies()
        return { ok: false, error: "Resposta de refresh invalida." }
    }

    await writeAuthCookies(payload.tokens)

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
