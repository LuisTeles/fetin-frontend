export type AuthUser = {
    id: string
    name: string
    email: string
    role?: string
    created_at: string
}

export type AuthTokens = {
    access_token: string
    /**
     * Never present. The backend delivers the refresh token only as an httpOnly
     * cookie; read it with extractBackendRefreshToken() instead of from the body.
     */
    refresh_token?: never
    token_type: string
    expires_in: number
}

export type AuthSuccessResponse = {
    message: string
    user: AuthUser
    tokens: AuthTokens
}

export type ApiErrorResponse = {
    error?: string
    message?: string | string[]
    status?: number
    statusCode?: number
}
