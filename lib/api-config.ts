export const BACKEND_API_BASE_URL =
    process.env.BACKEND_API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3000/api/v1"

// Cookie the NestJS backend sets on its own responses. The BFF reads it off
// Set-Cookie and stores the value under REFRESH_TOKEN_COOKIE for the browser.
export const BACKEND_REFRESH_COOKIE = "refresh_token"

export const ACCESS_TOKEN_COOKIE = "fetin_access_token"
export const REFRESH_TOKEN_COOKIE = "fetin_refresh_token"

export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 15
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
