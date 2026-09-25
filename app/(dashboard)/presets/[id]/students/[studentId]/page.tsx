"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateSafe } from "@/lib/format"
import { cn } from "@/lib/utils"
import { apiGetStudentProgress, type StudentProgress } from "@/lib/api/presets"

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`)

export default function StudentProgressPage() {
    const { id, studentId } = useParams<{ id: string; studentId: string }>()
    const [data, setData] = useState<StudentProgress | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        apiGetStudentProgress(id, studentId)
            .then(setData)
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Aluno não encontrado."))
    }, [id, studentId])

    const back = <Link href={`/presets/${id}/insights`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}><ArrowLeft className="h-4 w-4" />Progresso da turma</Link>

    if (!data) {
        return (
            <section className="space-y-4">
                {back}
                {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : <p className="text-xs text-muted-foreground">Carregando…</p>}
            </section>
        )
    }

    return (
        <section className="space-y-6">
            {back}
            <div className="space-y-1 border-b border-border/40 pb-4">
                <h1 className="page-title">{data.student.name}</h1>
                <p className="text-xs text-muted-foreground">
                    Aplicou em {formatDateSafe(data.applied_at)} (versão {data.version_applied}). Somente leitura: você vê o progresso nos tópicos do preset, nunca notas, textos de cards ou outras disciplinas.
                </p>
            </div>
            <Card>
                <CardHeader className="px-4"><CardTitle className="text-sm font-bold">Tópicos</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto px-4">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b text-muted-foreground">
                                <th className="py-2 pr-3 font-medium">Tópico</th>
                                <th className="py-2 pr-3 font-medium">Situação</th>
                                <th className="py-2 pr-3 font-medium">Retenção estimada</th>
                                <th className="py-2 pr-3 font-medium">Sessões</th>
                                <th className="py-2 pr-3 font-medium">Flashcards</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.topics.map((t) => (
                                <tr key={t.key} className="border-b border-border/40">
                                    <td className="py-1.5 pr-3 font-medium">{t.name}</td>
                                    <td className="py-1.5 pr-3">
                                        {t.is_completed ? <Badge className="text-[10px]">Concluído</Badge> : t.studied_pct > 0 ? <Badge variant="secondary" className="text-[10px]">Estudado</Badge> : <Badge variant="outline" className="text-[10px]">Não iniciado</Badge>}
                                    </td>
                                    <td className="py-1.5 pr-3 tabular-nums">{pct(t.avg_retention)}</td>
                                    <td className="py-1.5 pr-3 tabular-nums">{t.sessions.total === 0 ? "—" : `${t.sessions.completed}/${t.sessions.total}`}</td>
                                    <td className="py-1.5 pr-3 tabular-nums">{t.reviews === 0 ? "—" : `${pct(t.flashcard_accuracy)} (${t.reviews})`}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </section>
    )
}
