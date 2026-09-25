import Link from "next/link"
import { ClipboardCheck, Plus } from "lucide-react"

import { SessionExpired } from "@/app/(dashboard)/dashboard/_components/session-expired"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import type { SentAssignment } from "@/lib/api/professor"
import { formatDateTime } from "@/lib/format"
import { getAnalytics } from "@/lib/server-data"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function ProfessorAssignmentsPage() {
    const result = await getAnalytics<SentAssignment[]>("/assignments")

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 pb-4">
                <div className="space-y-1">
                    <h1 className="page-title">Atividades enviadas</h1>
                    <p className="text-xs text-muted-foreground">Revisões e testes que você enviou a alunos da turma, com a nota de cada um.</p>
                </div>
                <Link href="/professor/assignments/new" className={cn(buttonVariants({ size: "sm" }), "gap-1")}>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />Nova atividade
                </Link>
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
                        <EmptyState icon={<ClipboardCheck />} message="Você ainda não enviou nenhuma atividade." />
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="overflow-x-auto p-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                                    <th scope="col" className="px-2 py-2 font-medium">Atividade</th>
                                    <th scope="col" className="px-2 py-2 font-medium">Aluno</th>
                                    <th scope="col" className="px-2 py-2 font-medium">Enviada</th>
                                    <th scope="col" className="px-2 py-2 font-medium">Situação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.data.map((a) => (
                                    <tr key={a.id} className="border-b border-border/30 last:border-0">
                                        <td className="px-2 py-2"><Link href={`/professor/assignments/${a.id}`} className="font-medium hover:underline">{a.title}</Link></td>
                                        <td className="px-2 py-2">{a.student.name}</td>
                                        <td className="px-2 py-2 text-xs text-muted-foreground">{formatDateTime(a.sent_at)}</td>
                                        <td className="num px-2 py-2">
                                            {a.status === "SUBMITTED" ? `${a.score}/${a.max_score} pts` : <Badge variant="secondary">Aguardando resposta</Badge>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}
        </section>
    )
}
