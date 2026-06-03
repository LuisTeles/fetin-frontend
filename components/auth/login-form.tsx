"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ApiSuccess = {
    message?: string
}

type ApiError = {
    message?: string
}

export function LoginForm() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setError(null)
        setSuccessMessage(null)

        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email.trim().toLowerCase(),
                password,
            }),
        })

        const payload = (await response.json().catch(() => ({}))) as
            | ApiSuccess
            | ApiError

        if (!response.ok) {
            setError(payload.message ?? "Nao foi possivel fazer login.")
            setIsLoading(false)
            return
        }

        setSuccessMessage(payload.message ?? "Login realizado com sucesso.")
        router.replace("/dashboard")
        router.refresh()
    }

    return (
        <Card className="border-border/60 bg-card/95 shadow-lg backdrop-blur">
            <CardHeader>
                <CardTitle>Entrar</CardTitle>
                <CardDescription>
                    Use seu e-mail e senha para acessar o dashboard.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4" onSubmit={onSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="voce@exemplo.com"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="********"
                            minLength={8}
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </div>

                    {error ? (
                        <Alert variant="destructive">
                            <AlertTitle>Falha no login</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : null}

                    {successMessage ? (
                        <Alert>
                            <AlertTitle>Sucesso</AlertTitle>
                            <AlertDescription>{successMessage}</AlertDescription>
                        </Alert>
                    ) : null}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Entrando..." : "Entrar"}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        Ainda nao tem conta?{" "}
                        <Link className="font-medium text-foreground underline" href="/signup">
                            Criar conta
                        </Link>
                    </p>
                </form>
            </CardContent>
        </Card>
    )
}
