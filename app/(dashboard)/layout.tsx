import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/api-config"

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

    return (
        <div className="min-h-screen bg-muted/40">
            <header className="border-b bg-background">
                <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
                    <div>
                        <p className="text-lg font-semibold">Fetin Dashboard</p>
                        <p className="text-sm text-muted-foreground">MVP de integracao com backend de usuarios</p>
                    </div>
                    <Badge variant="outline">Auth Test</Badge>
                </div>
            </header>

            <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
                <nav className="rounded-lg border bg-background p-2">
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
                    </ul>
                </nav>

                <main className="rounded-lg border bg-background p-4">
                    <Separator className="mb-4" />
                    {children}
                </main>
            </div>
        </div>
    )
}
