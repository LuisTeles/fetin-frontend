import Link from "next/link"
import { Check, X } from "lucide-react"

import { SessionExpired } from "@/app/(dashboard)/dashboard/_components/session-expired"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { AssignmentReview } from "@/lib/api/professor"
import { formatDateTime } from "@/lib/format"
import { getAnalytics } from "@/lib/server-data"

export const dynamic = "force-dynamic"

export default async function AssignmentReviewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const result = await getAnalytics<AssignmentReview>(`/assignments/${id}/review`)

    if (!result.ok) {
        return (
            <section className="space-y-4">
                <Link href="/professor/assignments" className="text-xs text-muted-foreground hover:underline">← Atividades enviadas</Link>
                {result.sessionExpired ? (
                    <SessionExpired />
                ) : (
                    <div role="status" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{result.error}</div>
                )}
            </section>
        )
    }

    const a = result.data
    return (
        <section className="space-y-6">
            <div className="space-y-1 border-b border-border/40 pb-4">
                <Link href="/professor/assignments" className="text-xs text-muted-foreground hover:underline">← Atividades enviadas</Link>
                <h1 className="page-title">{a.title}</h1>
                <p className="text-xs text-muted-foreground">
                    Para <Link href={`/professor/students/${a.student.id}`} className="hover:underline">{a.student.name}</Link> · enviada em {formatDateTime(a.sent_at)}
                </p>
            </div>

            {!a.result ? (
                <Card>
                    <CardContent className="p-4 text-sm text-muted-foreground">
                        <Badge variant="secondary">Aguardando resposta</Badge> O aluno ainda não respondeu.
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card>
                        <CardHeader className="p-4">
                            <CardDescription className="text-xs">Nota</CardDescription>
                            <CardTitle className="num text-2xl">{a.result.score} / {a.result.max_score} pts</CardTitle>
                        </CardHeader>
                    </Card>
                    <div className="space-y-3">
                        {a.result.per_question.map((q, i) => (
                            <Card key={q.id}>
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="flex items-start gap-2 text-sm font-semibold">
                                        {q.correct ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Correta" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="Incorreta" />}
                                        <span>{i + 1}. {q.prompt} <span className="num text-xs font-normal text-muted-foreground">({q.points} pt{q.points === 1 ? "" : "s"})</span></span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <ul className="space-y-1 text-sm">
                                        {(q.options ?? []).map((opt, idx) => {
                                            const chosen = q.chosen.includes(idx)
                                            const expected = q.expected.includes(idx)
                                            return (
                                                <li key={idx} className="flex items-center gap-2">
                                                    <span className="w-24 shrink-0 text-xs text-muted-foreground">
                                                        {chosen && "marcada"}{chosen && expected && " · "}{expected && "correta"}
                                                    </span>
                                                    <span className={expected ? "font-medium" : undefined}>{opt}</span>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </section>
    )
}
