"use client"

import { useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type UserProfile = {
    id: string
    name: string
    email: string
    created_at: string
}

type ProfileResponse = {
    user?: UserProfile
    message?: string
}

export function ProfilePanel() {
    const [user, setUser] = useState<UserProfile | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let active = true

        async function loadProfile() {
            const response = await fetch("/api/auth/me", { cache: "no-store" })
            const payload = (await response.json().catch(() => ({}))) as ProfileResponse

            if (!active) {
                return
            }

            if (!response.ok || !payload.user) {
                setError(payload.message ?? "Nao foi possivel carregar o perfil.")
                return
            }

            setUser(payload.user)
        }

        loadProfile()

        return () => {
            active = false
        }
    }, [])

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Erro ao carregar perfil</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    if (!user) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Carregando perfil</CardTitle>
                    <CardDescription>Buscando dados do endpoint protegido /users/me.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Perfil autenticado</CardTitle>
                <CardDescription>Dados vindos de GET /users/me via rota interna.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <p className="text-sm">
                    <span className="font-medium">Nome:</span> {user.name}
                </p>
                <p className="text-sm">
                    <span className="font-medium">E-mail:</span> {user.email}
                </p>
                <p className="text-sm">
                    <span className="font-medium">ID:</span> {user.id}
                </p>
                <Badge variant="outline">
                    Criado em {new Date(user.created_at).toLocaleString("pt-BR")}
                </Badge>
            </CardContent>
        </Card>
    )
}
