"use client"

import { useEffect, useState } from "react"
import { User as UserIcon, Calendar, Mail, ShieldAlert } from "lucide-react"

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
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 text-destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="ml-1 text-sm font-semibold">Erro ao carregar perfil</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
        )
    }

    if (!user) {
        return (
            <Card className="border-border/60 shadow-xs">
                <CardHeader className="p-4 pb-2 animate-pulse">
                    <div className="h-5 w-32 bg-muted rounded"></div>
                    <div className="h-3 w-48 bg-muted rounded mt-2"></div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <div className="space-y-2">
                        <div className="h-4 w-full bg-muted rounded"></div>
                        <div className="h-4 w-3/4 bg-muted rounded"></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Get initials for profile placeholder
    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()

    return (
        <Card className="border-border/60 bg-card overflow-hidden shadow-xs hover:border-foreground/20 transition-all duration-200">
            <CardHeader className="p-4 pb-2 border-b border-border/40 bg-muted/10">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono text-sm font-bold tracking-wider">
                        {initials}
                    </div>
                    <div>
                        <CardTitle className="text-sm font-bold text-foreground">{user.name}</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">Estudante autenticado</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground truncate">{user.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Cadastrado em {new Date(user.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[10px] text-muted-foreground">
                    <span>ID: <code className="font-mono text-foreground/80">{user.id}</code></span>
                    <Badge variant="outline" className="text-[10px] border-border/80 px-1.5 py-0">
                        Ativo
                    </Badge>
                </div>
            </CardContent>
        </Card>
    )
}
