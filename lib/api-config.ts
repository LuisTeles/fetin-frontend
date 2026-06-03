export const BACKEND_API_BASE_URL =
    process.env.BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3000/api/v1"

export const ACCESS_TOKEN_COOKIE = "fetin_access_token"
export const REFRESH_TOKEN_COOKIE = "fetin_refresh_token"

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 15
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
