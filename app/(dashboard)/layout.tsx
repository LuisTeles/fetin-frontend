import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/api-config"
import { ImpersonationBanner } from "@/components/auth/impersonation-banner"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = await cookies()
    const hasSession =
        cookieStore.has(ACCESS_TOKEN_COOKIE) || cookieStore.has(REFRESH_TOKEN_COOKIE)

    if (!hasSession) {
        redirect("/login")
    }

    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
    let isAdmin = false
    if (accessToken) {
        try {
            const parts = accessToken.split('.')
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
                isAdmin = payload.role === 'ADMIN'
            }
        } catch {
            // Ignore decoding issues
        }
    }

    return (
        <div className="min-h-screen bg-muted/40 flex flex-col">
            <ImpersonationBanner />
            
            <header className="border-b bg-background">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
                    <div>
                        <p className="text-lg font-semibold">Fetin Dashboard</p>
                        <p className="text-sm text-muted-foreground">MVP de integracao com backend de usuarios</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Badge variant="outline">Auth Test</Badge>
                    </div>
                </div>
            </header>

            <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[220px_1fr] flex-1">
                <nav className="rounded-lg border bg-background p-2 h-fit">
                    <ul className="space-y-1 text-sm">
                        <li>
                            <Link className="block rounded-md px-3 py-2 hover:bg-muted" href="/dashboard">
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link className="block rounded-md px-3 py-2 hover:bg-muted" href="/me">
                                Meu perfil
                            </Link>
                        </li>
                        <li>
                            <Link className="block rounded-md px-3 py-2 hover:bg-muted" href="/exams">
                                Provas
                            </Link>
                        </li>
                        <li>
                            <Link className="block rounded-md px-3 py-2 hover:bg-muted" href="/subjects">
                                Disciplinas
                            </Link>
                        </li>
                        <li>
                            <Link className="block rounded-md px-3 py-2 hover:bg-muted" href="/calendar">
                                Calendário
                            </Link>
                        </li>
                        {isAdmin && (
                            <li>
                                <Link className="block rounded-md px-3 py-2 hover:bg-muted text-yellow-600 font-medium" href="/admin/users">
                                    Painel Admin
                                </Link>
                            </li>
                        )}
                    </ul>
                </nav>

                <main className="rounded-lg border bg-background p-4 h-fit">
                    <Separator className="mb-4" />
                    {children}
                </main>
            </div>
        </div>
    )
}
