import { pluralize } from "@/lib/format"
import { InfoTip } from "@/components/ui/info-tip"
import { RangeFilter } from "./range-filter"
import { CurveScopeToggle } from "./curve-scope-toggle"
import type {
    BulletDatum,
    DivergingDatum,
    HeatmapRow,
    SparklineKpis,
} from "@/lib/api/dashboard"
import { getAnalytics } from "@/lib/server-data"
import {
    ActivityHeatmap,
    BulletChart,
    DivergingBars,
    RetentionCurveChart,
    SparklineKpiCards,
} from "@/components/dashboard/charts/lazy-charts"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import { ReadinessCard, type ExamReadiness } from "@/components/analytics/readiness-card"
import { StudyQueue, type StudyQueueItem } from "@/components/analytics/study-queue"
import {
    AdherencePanel,
    type AdherenceSummary,
} from "@/components/analytics/adherence-panel"
import {
    EffectivenessPanel,
    type EffectivenessSummary,
} from "@/components/analytics/effectiveness-panel"

import { SessionExpired } from "./session-expired"

/**
 * One async Server Component per widget, each hitting its own endpoint behind its own
 * Suspense boundary in `page.tsx`. Because the fetches are independent, each panel paints
 * as soon as its own query resolves — a slow heatmap no longer holds up the KPI row.
 *
 * `/dashboard/summary` still exists for clients that want the combined payload; nothing
 * here uses it. Splitting also let each endpoint narrow its own window — the KPI query
 * now reads 7 days where the combined payload read 8 weeks for every widget.
 */

type WidgetProps = { userId?: string | null }
type RangedWidgetProps = WidgetProps & { range: string }

/** Shared failure rendering, so every widget degrades the same way. */
function WidgetError({ message }: { message: string }) {
    return (
        <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
            {message}
        </div>
    )
}

export async function KpiWidget({ userId }: WidgetProps) {
    const result = await getAnalytics<SparklineKpis>("/dashboard/kpis", userId)
    if (!result.ok) {
        return result.sessionExpired ? <SessionExpired /> : <WidgetError message={result.error} />
    }
    return <SparklineKpiCards data={result.data} />
}

export async function HeatmapWidget({ userId }: WidgetProps) {
    const result = await getAnalytics<HeatmapRow[]>("/dashboard/heatmap", userId)
    if (!result.ok) {
        return result.sessionExpired ? <SessionExpired /> : <WidgetError message={result.error} />
    }

    const hasData = result.data.some((row) => row.data.some((cell) => cell.y > 0))

    return (
        <Card className="enter">
            <CardHeader className="border-b border-border/40 p-4">
                <CardTitle className="flex items-center gap-1 text-sm font-bold">
                    Mapa de Calor de Atividade Semanal
                    <InfoTip id="heat-tip">
                        Minutos concluídos por hora e dia da semana no seu fuso horário.
                    </InfoTip>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                    Distribuição de minutos estudados por hora do dia e dia da semana · 8 semanas ·
                    horário de Brasília. Identifica blocos de alta intensidade e vazios de
                    procrastinação.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
                {hasData ? (
                    <ActivityHeatmap data={result.data} />
                ) : (
                    <EmptyState message="Nenhuma sessão concluída ainda. Conclua sessões do seu cronograma para revelar seus padrões de estudo." />
                )}
            </CardContent>
        </Card>
    )
}

export async function ProgressWidgets({ userId }: WidgetProps) {
    const result = await getAnalytics<{
        bulletData: BulletDatum[]
        divergingData: DivergingDatum[]
    }>("/dashboard/progress", userId)
    if (!result.ok) {
        return result.sessionExpired ? <SessionExpired /> : <WidgetError message={result.error} />
    }

    const { bulletData, divergingData } = result.data

    return (
        <div className="stagger grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader className="border-b border-border/40 p-4">
                    <CardTitle className="flex items-center gap-1 text-sm font-bold">
                        Progresso do plano por disciplina
                        <InfoTip id="prog-tip">
                            Sessões concluídas sobre as sessões previstas no cronograma de cada disciplina.
                        </InfoTip>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        % · cronogramas ativos. Barras curtas revelam disciplinas negligenciadas;
                        0% é uma barra vazia, não uma disciplina ausente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                    {bulletData.length > 0 ? (
                        <BulletChart data={bulletData} />
                    ) : (
                        <EmptyState message="Gere um cronograma para acompanhar o progresso por disciplina." />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b border-border/40 p-4">
                    <CardTitle className="flex items-center gap-1 text-sm font-bold">
                        Planejado × Estudado por dia
                        <InfoTip id="div-tip" align="right">
                            Diferença entre os minutos concluídos e os minutos das sessões planejadas naquele dia. O dia de hoje aparece como &quot;em andamento&quot;.
                        </InfoTip>
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        min · últimos 14 dias. Valores negativos mostram sessões planejadas que não
                        foram concluídas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                    {divergingData.length > 0 ? (
                        <DivergingBars data={divergingData} />
                    ) : (
                        <EmptyState message="Ainda não há dias planejados para comparar." />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <p className="flex min-h-32 items-center justify-center text-balance px-6 text-center text-xs text-muted-foreground">
            {message}
        </p>
    )
}

export async function ReadinessWidget({ userId }: WidgetProps) {
    const result = await getAnalytics<ExamReadiness[]>("/analytics/readiness", userId)
    if (!result.ok) {
        return result.sessionExpired ? <SessionExpired /> : <WidgetError message={result.error} />
    }

    if (result.data.length === 0) {
        return (
            <Card className="enter">
                <CardHeader className="border-b border-border/40 p-4">
                    <CardTitle className="text-sm font-bold">Prontidão para Provas · até a prova</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <EmptyState message="Nenhuma prova futura cadastrada. Agende uma prova para ver a projeção de retenção." />
                </CardContent>
            </Card>
        )
    }

    // Soonest exams first — the backend already orders by date.
    return (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.data.slice(0, 3).map((exam) => (
                <ReadinessCard key={exam.examId} exam={exam} />
            ))}
        </div>
    )
}

export async function StudyQueueWidget({ userId }: WidgetProps) {
    const result = await getAnalytics<StudyQueueItem[]>("/analytics/study-queue?limit=20", userId)
    if (!result.ok) {
        return result.sessionExpired ? <SessionExpired /> : <WidgetError message={result.error} />
    }
    return <StudyQueue items={result.data} />
}

export async function AdherenceWidget({ userId, range }: RangedWidgetProps) {
    const result = await getAnalytics<AdherenceSummary>(
        `/analytics/adherence?days=${encodeURIComponent(range)}`,
        userId,
    )
    if (!result.ok) {
        return result.sessionExpired ? <SessionExpired /> : <WidgetError message={result.error} />
    }
    return <AdherencePanel data={result.data} rangeFilter={<RangeFilter />} />
}

interface TopicCurve {
    topicId: string
    topicName: string
    subjectName: string
    points: { date: string; retention: number }[]
    reviews: { occurredAt: string; sessionType: string; retentionAtReview: number }[]
    current: number
    nextReviewAt: string | null
}

export async function RetentionCurveWidget({
    userId,
    scope,
}: WidgetProps & { scope: "upcoming" | "all" }) {
    const result = await getAnalytics<TopicCurve[]>(
        `/analytics/retention-curve?limit=4&scope=${scope}`,
        userId,
    )
    if (!result.ok) {
        return result.sessionExpired ? <SessionExpired /> : <WidgetError message={result.error} />
    }

    return (
        <Card className="enter">
            <CardHeader className="border-b border-border/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-sm font-bold">Curva de Esquecimento</CardTitle>
                    <CurveScopeToggle />
                </div>
                <CardDescription className="text-pretty text-xs text-muted-foreground">
                    Retenção estimada ao longo do tempo (todo o histórico), reconstruída das
                    revisões. Mostra os 4 tópicos de menor retenção
                    {scope === "upcoming" ? " entre os que uma prova futura exige" : ""}. Cada
                    revisão achata a curva — é o método do produto, visível.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
                {result.data.length > 0 ? (
                    <RetentionCurveChart series={result.data} />
                ) : (
                    <EmptyState message={scope === "upcoming" ? "Nenhum tópico de prova futura tem histórico de revisões ainda. Conclua sessões ou veja Todos os tópicos." : "Sem histórico de revisões ainda. Conclua sessões para que a curva apareça."} />
                )}
            </CardContent>
        </Card>
    )
}

export async function EffectivenessWidget({ userId }: WidgetProps) {
    const result = await getAnalytics<EffectivenessSummary>("/analytics/effectiveness", userId)
    if (!result.ok) {
        return result.sessionExpired ? <SessionExpired /> : <WidgetError message={result.error} />
    }
    return <EffectivenessPanel data={result.data} />
}
