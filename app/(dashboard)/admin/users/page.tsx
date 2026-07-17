"use client"

import { useEffect, useState } from "react"
import { Search, UserCheck, Shield, Clock, Mail, ShieldAlert } from "lucide-react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type UserItem = {
    id: string
    name: string
    email: string
    role: string
    created_at: string
}

type UsersResponse = {
    users?: UserItem[]
    message?: string
}

export default function AdminUsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState<UserItem[]>([])
    const [search, setSearch] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function loadUsers() {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetch("/api/admin/users", { cache: "no-store" })
            const payload = (await response.json().catch(() => ({}))) as UsersResponse

            if (!response.ok) {
                setError(payload.message ?? "Não foi possível carregar os usuários.")
                return
            }

            setUsers(payload.users ?? [])
        } catch {
            setError("Erro de rede ao conectar com o servidor.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadUsers()
    }, [])

    const filteredUsers = users.filter(
        (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
    )

    function handleImpersonate(userId: string) {
        // Route to dashboard with search param to trigger impersonation mode
        router.push(`/dashboard?userId=${userId}`)
    }

    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Painel Administrativo</h1>
                <p className="text-xs text-muted-foreground">
                    Gerencie os usuários cadastrados e visualize seus respectivos painéis acadêmicos em modo de leitura.
                </p>
            </div>

            <Card className="border-border/60 bg-card shadow-xs">
                <CardHeader className="p-4 border-b border-border/40 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold">Usuários Cadastrados ({filteredUsers.length})</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Lista completa de estudantes e administradores registrados no sistema.
                        </CardDescription>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Buscar nome ou e-mail..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-9 text-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <ShieldAlert className="h-4 w-4" />
                            <AlertTitle>Erro ao carregar dados</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {isLoading ? (
                        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                            Carregando usuários do sistema...
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 p-8 text-center">
                            <Shield className="h-8 w-8 text-muted-foreground/60 mb-2" />
                            <p className="text-sm font-medium text-foreground">Nenhum usuário encontrado</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {search ? "Nenhum registro corresponde à sua busca." : "Sem usuários cadastrados no banco de dados."}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/40">
                            {filteredUsers.map((user) => {
                                const initials = user.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase()
                                const isUserAdmin = user.role === "ADMIN"

                                return (
                                    <div
                                        key={user.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3.5 hover:bg-muted/10 px-2 rounded-md transition-colors"
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                                                isUserAdmin 
                                                    ? "bg-foreground text-background" 
                                                    : "bg-muted text-foreground"
                                            }`}>
                                                {initials}
                                            </div>
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-sm font-semibold text-foreground truncate">
                                                        {user.name}
                                                    </h4>
                                                    <Badge
                                                        variant={isUserAdmin ? "default" : "outline"}
                                                        className="text-[9px] px-1.5 py-0"
                                                    >
                                                        {user.role}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-3.5 w-3.5" />
                                                        {user.email}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        Cadastrado em {new Date(user.created_at).toLocaleDateString("pt-BR")}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 justify-end shrink-0">
                                            {!isUserAdmin ? (
                                                <Button
                                                    onClick={() => handleImpersonate(user.id)}
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-1 text-xs"
                                                >
                                                    <UserCheck className="h-3.5 w-3.5" />
                                                    Visualizar Dashboard
                                                </Button>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground font-mono pr-2">
                                                    Administrador
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </section>
    )
}
