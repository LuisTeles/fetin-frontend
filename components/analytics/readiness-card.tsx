import Link from "next/link"
import { formatDate, formatPercent, pluralize } from "@/lib/format"
import { InfoTip } from "@/components/ui/info-tip"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

/**
 * Exam readiness.
 *
 * The form is a hero number, not a chart: a single percentage is understood faster as a
 * number than as a gauge, and gauges/donuts are anti-patterns for exactly this. The bar
 * pair underneath exists only to carry the comparison that makes the number mean something
 * — what happens if the plan is followed versus abandoned.
 *
 * A Server Component: no state, no effects, so it ships no client JavaScript.
 */

export interface ExamReadiness {
    examId: string
    examDate: string
    subjectName: string
    daysToExam: number
    projected: number
    abandoned: number
    current: number
    /** Topics linked to the exam; 0 means there is nothing to estimate. */
    topicCount: number
    hasActiveSchedule: boolean
    /** D7: the exam's date or topics changed after the plan was generated. */
    scheduleStale: boolean
    topics: { topicId: string; topicName: string; projected: number; weightValue: number }[]
}

/**
 * Status colours come from the validated palette (see lib/chart-palette.ts), delivered as
 * CSS variables so this stays a Server Component. Each tone always ships with its text
 * label — the palette's CVD margin is only legal with that secondary encoding.
 */
function toneFor(value: number) {
    if (value >= 0.8) return { label: "Confortável", color: "var(--status-good)" }
    if (value >= 0.6) return { label: "Atenção", color: "var(--status-warning)" }
    return { label: "Crítico", color: "var(--status-critical)" }
}

function ComparisonBar({
    label,
    value,
    barColor,
}: {
    label: string
    value: number
    barColor: string
}) {
    const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100)
    return (
        <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold tabular-nums text-foreground">
                    {formatPercent(value)}
                </span>
            </div>
            {/* Track + fill rather than a chart library: two values do not need one. */}
            <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${label}: ${pct}%`}
            >
                <div className="bar-fill h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
            </div>
        </div>
    )
}

export function ReadinessCard({ exam }: { exam: ExamReadiness }) {
    const tone = toneFor(exam.projected)
    const gain = exam.projected - exam.abandoned
    const noTopics = exam.topicCount === 0

    return (
        <Card>
            <CardHeader className="border-b border-border/40 p-4">
                <CardTitle className="text-sm font-bold text-balance">
                    {exam.subjectName}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                    Prova em {formatDate(exam.examDate)} ·{" "}
                    <span className="tabular-nums">{exam.daysToExam}</span>{" "}
                    {exam.daysToExam === 1 ? "dia" : "dias"} · {pluralize(exam.topics.length, "tópico", "tópicos")}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
                {exam.scheduleStale && (
                    <div
                        role="status"
                        className="flex flex-col gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"
                    >
                        <span className="flex items-center gap-1 font-semibold">
                            Cronograma desatualizado
                            <InfoTip id={`stale-tip-${exam.examId}`}>
                                A data ou os tópicos da prova mudaram depois que este cronograma foi gerado. Gere um novo para atualizar a previsão.
                            </InfoTip>
                        </span>
                        <span>
                            A previsão abaixo usa o plano antigo.{" "}
                            <Link href="/auto-schedule" className="font-medium underline">
                                Regenerar cronograma
                            </Link>
                        </span>
                    </div>
                )}

                {noTopics ? (
                    <div className="space-y-1">
                        <p className="text-2xl font-bold tracking-tight text-muted-foreground">Sem tópicos</p>
                        <p className="text-pretty text-xs text-muted-foreground">
                            Vincule tópicos a esta prova para estimar a retenção no dia dela.
                        </p>
                    </div>
                ) : (
                <>
                <div className="flex items-baseline gap-2">
                    <span
                        className="text-4xl font-bold tracking-tight tabular-nums"
                        style={{ color: tone.color }}
                    >
                        {formatPercent(exam.projected)}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        Retenção esperada no dia da prova · {tone.label}
                        <InfoTip id={`ready-tip-${exam.examId}`}>
                            Estimativa do quanto você lembrará de cada tópico no dia da prova se cumprir as sessões planejadas. É uma estimativa, não uma nota.
                        </InfoTip>
                    </span>
                </div>

                <div className="space-y-3">
                    <ComparisonBar
                        label="Se cumprir o plano"
                        value={exam.projected}
                        barColor="var(--status-good)"
                    />
                    <ComparisonBar
                        label="Se parar hoje"
                        value={exam.abandoned}
                        barColor="color-mix(in oklab, var(--muted-foreground) 50%, transparent)"
                    />
                </div>

                <p className="flex items-start gap-1 text-pretty text-xs text-muted-foreground">
                    <InfoTip id={`scen-tip-${exam.examId}`}>
                        Mesma estimativa em dois cenários: cumprindo todas as sessões restantes ou não estudando mais.
                    </InfoTip>
                    <span>
                    {gain > 0.01 ? (
                        <>
                            Cumprir o cronograma vale{" "}
                            <strong className="tabular-nums text-foreground">
                                +{formatPercent(gain)}
                            </strong>{" "}
                            de retenção no dia da prova.
                        </>
                    ) : (
                        <>
                            Não há sessões planejadas suficientes até a prova para elevar a
                            retenção. Gere ou ajuste o cronograma.
                        </>
                    )}
                    </span>
                </p>
                </>
                )}
            </CardContent>
        </Card>
    )
}
