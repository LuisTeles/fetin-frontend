import Link from "next/link"
import { ClipboardCheck } from "lucide-react"

import { SessionExpired } from "@/app/(dashboard)/dashboard/_components/session-expired"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import type { MyAssignment } from "@/lib/api/professor"
import { formatDateTime } from "@/lib/format"
import { getAnalytics } from "@/lib/server-data"

export const dynamic = "force-dynamic"

export default async function AssignmentsInboxPage() {
    const result = await getAnalytics<MyAssignment[]>("/assignments/mine")

    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
                <h1 className="page-title">Atividades</h1>
                <p className="text-xs text-muted-foreground">Revisões e testes que seu professor enviou para você.</p>
            </div>

            {!result.ok ? (
                result.sessionExpired ? (
                    <SessionExpired />
                ) : (
                    <div role="status" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{result.error}</div>
                )
            ) : result.data.length === 0 ? (
                <Card>
                    <CardContent>
                        <EmptyState icon={<ClipboardCheck />} message="Nenhuma atividade por aqui. Quando seu professor enviar uma, ela aparece nesta lista." />
                    </CardContent>
                </Card>
            ) : (
                <ul className="space-y-2">
                    {result.data.map((a) => (
                        <li key={a.id}>
                            <Link href={`/assignments/${a.id}`} className="block rounded-xl border bg-surface p-4 transition-colors hover:bg-muted/40">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold">{a.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Prof. {a.professor.name} · enviada em {formatDateTime(a.sent_at)}
                                            {a.due_at && a.status === "SENT" ? ` · prazo ${formatDateTime(a.due_at)}` : ""}
                                        </p>
                                    </div>
                                    {a.status === "SUBMITTED" ? (
                                        <span className="num text-sm font-semibold">{a.score}/{a.max_score} pts</span>
                                    ) : (
                                        <Badge>Responder</Badge>
                                    )}
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
