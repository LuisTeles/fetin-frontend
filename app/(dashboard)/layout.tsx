import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/api-config"
import { ImpersonationBanner } from "@/components/auth/impersonation-banner"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { GlobalNoteFab } from "@/components/notes/global-note-fab"
import { NavLink } from "@/components/layout/nav-link"
import { UserAvatar } from "@/components/layout/user-avatar"
import { PageEnter } from "@/components/layout/page-enter"
import { SlidingIndicator } from "@/components/ui/sliding-indicator"

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
    let isProfessor = false
    if (accessToken) {
        try {
            const parts = accessToken.split('.')
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
                isAdmin = payload.role === 'ADMIN'
                // Cosmetic only, like the admin link: the backend re-checks the role in the database.
                isProfessor = payload.role === 'PROFESSOR'
            }
        } catch {
            // Ignore decoding issues
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <ImpersonationBanner />

            <header className="border-b bg-surface">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
                    <div>
                        <p className="text-lg font-semibold tracking-tight">Fetin Dashboard</p>
                        {/* Tagline opcional: <p className="text-sm text-text-muted">…</p> */}
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <UserAvatar />
                    </div>
                </div>
            </header>

            <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:px-6 md:grid-cols-[220px_1fr] flex-1">
                <nav
                    aria-label="Navegação principal"
                    className="h-fit rounded-xl border bg-surface p-2 shadow-[var(--shadow-card)] md:sticky md:top-12 md:self-start"
                >
                    <SlidingIndicator>
                    <ul className="relative z-10 space-y-0.5">
                        <li><NavLink href="/dashboard" icon="dashboard">Dashboard</NavLink></li>
                        <li><NavLink href="/sessions" icon="sessions">Sessões</NavLink></li>
                        <li><NavLink href="/me" icon="profile">Meu perfil</NavLink></li>
                        <li><NavLink href="/exams" icon="exams">Provas</NavLink></li>
                        <li><NavLink href="/subjects" icon="subjects">Disciplinas</NavLink></li>
                        <li><NavLink href="/calendar" icon="calendar">Calendário</NavLink></li>
                        <li><NavLink href="/notes" icon="notes">Notas Rápidas</NavLink></li>
                        <li><NavLink href="/flashcards" icon="flashcards">Flashcards</NavLink></li>
                        <li><NavLink href="/classes" icon="classes">Turmas</NavLink></li>
                        <li><NavLink href="/auto-schedule" icon="schedule">Calendário Automático</NavLink></li>
                        <li><NavLink href="/availability" icon="availability">Disponibilidade</NavLink></li>
                        {isProfessor && (
                            <>
                                <li><NavLink href="/presets" icon="presets">Meus presets</NavLink></li>
                                <li><NavLink href="/professor/students" icon="students">Meus alunos</NavLink></li>
                            </>
                        )}
                        {isAdmin && (
                            <li><NavLink href="/admin/users" icon="admin">Painel Admin</NavLink></li>
                        )}
                    </ul>
                    </SlidingIndicator>
                </nav>

                <main className="min-w-0">
                    <PageEnter>{children}</PageEnter>
                </main>
            </div>

            <GlobalNoteFab />
        </div>
    )
}
