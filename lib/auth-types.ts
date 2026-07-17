export type AuthUser = {
    id: string
    name: string
    email: string
    role?: string
    created_at: string
}

export type AuthTokens = {
    access_token: string
    refresh_token: string
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
