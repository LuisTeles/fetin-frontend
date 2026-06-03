import {
    REFRESH_TOKEN_COOKIE,
} from "@/lib/api-config"
import {
    clearAuthCookies,
    forwardToBackend,
    getAccessTokenFromCookie,
    toJsonResponse,
} from "@/lib/server-auth"
import { cookies } from "next/headers"

export async function POST() {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value
    const accessToken = await getAccessTokenFromCookie()

    if (refreshToken && accessToken) {
        await forwardToBackend("/auth/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        })
    }

    await clearAuthCookies()

    return toJsonResponse({ message: "Logout realizado com sucesso." }, 200)
}

export async function DELETE() {
    return POST()
}
