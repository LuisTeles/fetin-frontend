import { formatDate, formatPercent, pluralize } from "@/lib/format"
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
                <div className="flex items-baseline gap-2">
                    <span
                        className="text-4xl font-bold tracking-tight tabular-nums"
                        style={{ color: tone.color }}
                    >
                        {formatPercent(exam.projected)}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                        de retenção projetada · {tone.label}
                    </span>
                </div>

                <div className="space-y-3">
                    <ComparisonBar
                        label="Seguindo o cronograma"
                        value={exam.projected}
                        barColor="var(--status-good)"
                    />
                    <ComparisonBar
                        label="Parando de estudar hoje"
                        value={exam.abandoned}
                        barColor="color-mix(in oklab, var(--muted-foreground) 50%, transparent)"
                    />
                </div>

                <p className="text-pretty text-xs text-muted-foreground">
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
                </p>
            </CardContent>
        </Card>
    )
}
