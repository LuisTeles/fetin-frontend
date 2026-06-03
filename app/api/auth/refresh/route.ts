import { refreshTokensFromCookie, toJsonError, toJsonResponse } from "@/lib/server-auth"

export async function POST() {
    const result = await refreshTokensFromCookie()

    if (!result.ok) {
        return toJsonError(401, result.error ?? "Sessao expirada.")
    }

    return toJsonResponse({ message: "Sessao renovada." }, 200)
}
