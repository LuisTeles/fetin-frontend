"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ApiResponse = {
    message?: string
}

function validatePassword(value: string) {
    const hasLowercase = /[a-z]/.test(value)
    const hasUppercase = /[A-Z]/.test(value)
    const hasNumber = /\d/.test(value)
    const hasSymbol = /[^A-Za-z0-9]/.test(value)
    const hasLength = value.length >= 8

    return {
        valid: hasLowercase && hasUppercase && hasNumber && hasSymbol && hasLength,
        checks: { hasLowercase, hasUppercase, hasNumber, hasSymbol, hasLength },
    }
}

export function SignupForm() {
    const router = useRouter()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const validation = useMemo(() => validatePassword(password), [password])

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)

        if (!validation.valid) {
            setError("A senha nao atende aos requisitos minimos de seguranca.")
            return
        }

        setIsLoading(true)

        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password,
            }),
        })

        const payload = (await response.json().catch(() => ({}))) as ApiResponse

        if (!response.ok) {
            setError(payload.message ?? "Nao foi possivel criar a conta.")
            setIsLoading(false)
            return
        }

        router.replace("/dashboard")
        router.refresh()
    }

    return (
        <Card className="border-border/60 bg-card/95 shadow-lg backdrop-blur">
            <CardHeader>
                <CardTitle>Criar conta</CardTitle>
                <CardDescription>
                    Cadastre-se para testar os endpoints protegidos do backend.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className="space-y-4" onSubmit={onSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome</Label>
                        <Input
                            id="name"
                            type="text"
                            autoComplete="name"
                            minLength={2}
                            required
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
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
                            autoComplete="new-password"
                            minLength={8}
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Minimo de 8 caracteres com letra maiuscula, minuscula, numero e simbolo.
                        </p>
                    </div>

                    {!validation.valid && password.length > 0 ? (
                        <Alert variant="destructive">
                            <AlertTitle>Senha invalida</AlertTitle>
                            <AlertDescription>
                                Revise os requisitos antes de continuar.
                            </AlertDescription>
                        </Alert>
                    ) : null}

                    {error ? (
                        <Alert variant="destructive">
                            <AlertTitle>Falha no cadastro</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : null}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Criando conta..." : "Criar conta"}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        Ja possui conta?{" "}
                        <Link className="font-medium text-foreground underline" href="/login">
                            Fazer login
                        </Link>
                    </p>
                </form>
            </CardContent>
        </Card>
    )
}
