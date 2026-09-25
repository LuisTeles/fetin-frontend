import Link from "next/link"
import { Send } from "lucide-react"

import { SessionExpired } from "@/app/(dashboard)/dashboard/_components/session-expired"
import { WeekdayAdherenceChart } from "@/components/dashboard/charts/lazy-charts"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import type { StudentDetail } from "@/lib/api/professor"
import { formatDateSafe, formatDateTime, formatPercent } from "@/lib/format"
import { getAnalytics } from "@/lib/server-data"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const pct = (v: number | null) => (v === null ? "—" : formatPercent(v))

export default async function ProfessorStudentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const result = await getAnalytics<StudentDetail>(`/professor/dashboard/students/${id}`)

    if (!result.ok) {
        return (
            <section className="space-y-4">
                <Link href="/professor/dashboard" className="text-xs text-muted-foreground hover:underline">← Painel da turma</Link>
                {result.sessionExpired ? (
                    <SessionExpired />
                ) : (
                    <div role="status" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{result.error}</div>
                )}
            </section>
        )
    }

    const s = result.data
    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 pb-4">
                <div className="space-y-1">
                    <Link href="/professor/dashboard" className="text-xs text-muted-foreground hover:underline">← Painel da turma</Link>
                    <h1 className="page-title">{s.name}</h1>
                    <p className="text-xs text-muted-foreground">Progresso de estudo e atividades. Somente números: nada do que o aluno escreve é exibido.</p>
                </div>
                <Link href={`/professor/assignments/new?studentId=${s.id}`} className={cn(buttonVariants({ size: "sm" }), "gap-1")}>
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />Enviar atividade
                </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader className="border-b border-border/40 p-4">
                        <CardTitle className="text-sm font-bold">Retenção por disciplina</CardTitle>
                        <CardDescription className="text-xs">Memória estimada agora, dos tópicos já estudados.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        {s.subjects.length === 0 ? (
                            <EmptyState icon={<Send />} message="Ainda sem estudo registrado." />
                        ) : (
                            <ul className="divide-y divide-border/40 text-sm">
                                {s.subjects.map((x) => (
                                    <li key={x.name} className="flex items-center justify-between gap-2 py-2">
                                        <span>{x.name}</span>
                                        <span className="num text-xs text-muted-foreground">{pct(x.avg_retention)} · {x.studied_topics} tópico(s) estudado(s)</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="border-b border-border/40 p-4">
                        <CardTitle className="text-sm font-bold">Prontidão para as provas</CardTitle>
                        <CardDescription className="text-xs">Projetada se o aluno cumprir o plano, e agora.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        {s.exams.length === 0 ? (
                            <EmptyState icon={<Send />} message="Nenhuma prova futura cadastrada." />
                        ) : (
                            <ul className="divide-y divide-border/40 text-sm">
                                {s.exams.map((e) => (
                                    <li key={`${e.subject}-${e.exam_date}`} className="flex items-center justify-between gap-2 py-2">
                                        <span>{e.subject} <span className="text-xs text-muted-foreground">· {formatDateSafe(e.exam_date)} (em {e.days_to_exam} d)</span></span>
                                        <span className="num text-xs text-muted-foreground">projetada {pct(e.readiness_projected)} · agora {pct(e.readiness_current)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="border-b border-border/40 p-4">
                    <CardTitle className="text-sm font-bold">Adesão por dia da semana (30 dias)</CardTitle>
                    <CardDescription className="text-xs">Sessões concluídas e não feitas (puladas ou vencidas).</CardDescription>
                </CardHeader>
                <CardContent className="p-4"><WeekdayAdherenceChart data={s.adherence_by_weekday} /></CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b border-border/40 p-4">
                    <CardTitle className="text-sm font-bold">Atividades</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {s.assignments.length === 0 ? (
                        <EmptyState icon={<Send />} message="Nenhuma atividade enviada a este aluno." />
                    ) : (
                        <ul className="divide-y divide-border/40 text-sm">
                            {s.assignments.map((a) => (
                                <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                                    <Link href={`/professor/assignments/${a.id}`} className="hover:underline">{a.title}</Link>
                                    {a.status === "SUBMITTED" ? (
                                        <span className="num text-xs">{a.score}/{a.max_score} pts <span className="text-muted-foreground">· {formatDateTime(a.submitted_at)}</span></span>
                                    ) : (
                                        <Badge variant="secondary">Aguardando resposta</Badge>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </section>
    )
}
