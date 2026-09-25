"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, EyeOff, Users } from "lucide-react"

import { TopicMetricChart, type MetricRow } from "@/components/presets/topic-metric-chart"
import { nativeSelectClass } from "@/components/flashcards/native-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDateSafe, pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
    apiGetAppliedStudents, apiGetPresetInsights, type AppliedStudent, type InsightTopic, type PresetInsights,
} from "@/lib/api/presets"

type MetricKey = "completed_pct" | "studied_pct" | "avg_retention" | "session_completion" | "flashcard_accuracy"

const METRICS: { key: MetricKey; label: string; help: string }[] = [
    { key: "completed_pct", label: "Tópicos concluídos", help: "Parcela dos alunos que marcaram o tópico como concluído." },
    { key: "studied_pct", label: "Tópicos estudados", help: "Parcela dos alunos que já concluíram ao menos uma sessão do tópico." },
    { key: "avg_retention", label: "Retenção estimada", help: "Curva de esquecimento (Ebbinghaus) de hoje, só entre quem já estudou o tópico." },
    { key: "session_completion", label: "Sessões concluídas", help: "Sessões concluídas sobre todas as sessões planejadas para o tópico." },
    { key: "flashcard_accuracy", label: "Acerto nos flashcards", help: "Revisões com nota Bom ou Fácil sobre todas as revisões do tópico. Nenhum texto de card é exibido." },
]

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`)

function detailOf(t: InsightTopic, key: MetricKey): string {
    if (key === "session_completion") return `${t.sessions.completed} de ${t.sessions.total} sessões`
    if (key === "flashcard_accuracy") return pluralize(t.reviews, "revisão", "revisões")
    return pluralize(t.students, "aluno", "alunos")
}

export default function PresetInsightsPage() {
    const { id } = useParams<{ id: string }>()
    const [insights, setInsights] = useState<PresetInsights | null>(null)
    const [students, setStudents] = useState<AppliedStudent[]>([])
    const [metric, setMetric] = useState<MetricKey>("completed_pct")
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([apiGetPresetInsights(id), apiGetAppliedStudents(id)])
            .then(([i, s]) => { setInsights(i); setStudents(s) })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao carregar o progresso."))
    }, [id])

    const back = <Link href="/presets" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}><ArrowLeft className="h-4 w-4" />Presets</Link>

    if (!insights) {
        return (
            <section className="space-y-4">
                {back}
                {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : <p className="text-xs text-muted-foreground">Carregando…</p>}
            </section>
        )
    }

    const current = METRICS.find((m) => m.key === metric)!
    const rows: MetricRow[] = insights.topics.map((t) => ({ name: t.name, value: t[metric], detail: detailOf(t, metric) }))

    return (
        <section className="space-y-6">
            {back}
            <div className="space-y-1 border-b border-border/40 pb-4">
                <h1 className="page-title">Progresso: {insights.name}</h1>
                <p className="text-xs text-muted-foreground">
                    {pluralize(insights.applied_count, "aluno aplicou", "alunos aplicaram")} a versão {insights.version} ou anterior. Só aparecem tópicos do preset, em números agregados: nunca notas, textos de cards ou dados fora da turma.
                </p>
            </div>

            {insights.hidden ? (
                <Alert>
                    <EyeOff className="h-4 w-4" />
                    <AlertDescription>
                        Com menos de {insights.min_cohort} alunos que aplicaram o preset (agora {insights.applied_count}) os números agregados ficam ocultos, para não identificar ninguém pela média. Você ainda pode abrir o progresso de cada aluno abaixo.
                    </AlertDescription>
                </Alert>
            ) : (
                <>
                    <Card>
                        <CardHeader className="px-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-sm font-bold">{current.label} por tópico</CardTitle>
                                    <CardDescription className="text-xs">{current.help}</CardDescription>
                                </div>
                                <select value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)} aria-label="Métrica" className={nativeSelectClass}>
                                    {METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent className="px-4">
                            {rows.every((r) => r.value === null) ? (
                                <EmptyState icon={<Users />} message={`Ainda sem dados de "${current.label.toLowerCase()}" nesta turma.`} />
                            ) : (
                                <TopicMetricChart rows={rows} metricLabel={current.label} />
                            )}
                        </CardContent>
                    </Card>

                    <details className="rounded-xl border bg-card">
                        <summary className="cursor-pointer px-4 py-3 text-sm font-bold">Ver como tabela</summary>
                        <div className="overflow-x-auto px-4 pb-4">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="py-2 pr-3 font-medium">Tópico</th>
                                        {METRICS.map((m) => <th key={m.key} className="py-2 pr-3 font-medium">{m.label}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {insights.topics.map((t) => (
                                        <tr key={t.key} className="border-b border-border/40">
                                            <td className="py-1.5 pr-3 font-medium">{t.name}</td>
                                            {METRICS.map((m) => <td key={m.key} className="py-1.5 pr-3 tabular-nums">{pct(t[m.key])}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </details>
                </>
            )}

            <Card>
                <CardHeader className="px-4"><CardTitle className="text-sm font-bold">Alunos que aplicaram ({students.length})</CardTitle></CardHeader>
                <CardContent className="px-4">
                    {students.length === 0 ? (
                        <EmptyState icon={<Users />} message="Nenhum aluno vinculado aplicou este preset ainda." />
                    ) : (
                        <ul className="divide-y divide-border/40">
                            {students.map((s) => (
                                <li key={s.student_id} className="flex items-center justify-between gap-2 py-2 text-sm">
                                    <span>{s.name} <span className="text-xs text-muted-foreground">· aplicou em {formatDateSafe(s.applied_at)} · versão {s.version_applied}</span></span>
                                    <Link href={`/presets/${id}/students/${s.student_id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}>Ver progresso</Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </section>
    )
}
