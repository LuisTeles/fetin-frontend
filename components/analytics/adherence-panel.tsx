import { CountUp } from "@/components/ui/count-up"
import { formatPercent } from "@/lib/format"
import { weekdayLabels } from "@/lib/format"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

/**
 * Adherence: how much of what was planned actually happened.
 *
 * The existing activity heatmap plots minutes *completed*, so it structurally cannot show
 * a rate — skipped and never-touched sessions are not in it. This panel counts all three,
 * which is what turns "you studied 12 hours" into "you skip 44% of your Fridays".
 *
 * Rate is a magnitude, so it gets a **sequential** encoding: one hue, five steps, direction
 * chosen per theme (see the --seq-* variables). No categorical palette is involved and no
 * chart library is loaded — every mark here is CSS, so the panel ships zero client JS.
 */

export interface AdherenceBucket {
    key: string
    label: string
    completed: number
    skipped: number
    missed: number
    total: number
    rate: number | null
}

export interface AdherenceDay {
    date: string
    weekday: number
    completed: number
    skipped: number
    missed: number
    total: number
    rate: number | null
}

export interface AdherenceSummary {
    windowDays: number
    overall: AdherenceBucket
    byWeekday: AdherenceBucket[]
    bySessionType: AdherenceBucket[]
    bySubject: AdherenceBucket[]
    daily: AdherenceDay[]
    hourlyAvailable: false
}

const SESSION_TYPE_LABEL: Record<string, string> = {
    new_content: "Conteúdo novo",
    spaced_review: "Revisão espaçada",
    pre_exam_review: "Revisão pré-prova",
}

/** Maps a 0–1 rate onto the five-step sequential ramp. */
function rampStep(rate: number | null): string {
    if (rate === null) return "var(--muted)"
    if (rate >= 0.9) return "var(--seq-5)"
    if (rate >= 0.75) return "var(--seq-4)"
    if (rate >= 0.55) return "var(--seq-3)"
    if (rate >= 0.35) return "var(--seq-2)"
    return "var(--seq-1)"
}

function RateRow({ label, bucket }: { label: string; bucket: AdherenceBucket }) {
    const pct = bucket.rate === null ? 0 : Math.round(bucket.rate * 100)
    return (
        <div className="grid grid-cols-[9rem_1fr_5.5rem] items-center gap-3 text-xs">
            <span className="truncate text-muted-foreground">{label}</span>
            <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`${label}: ${pct}% de aderência`}
            >
                <div
                    className="bar-fill h-full rounded-full"
                    style={{ width: `${pct}%`, background: rampStep(bucket.rate) }}
                />
            </div>
            <span className="text-right tabular-nums text-foreground">
                {bucket.rate === null ? "—" : formatPercent(bucket.rate)}
                <span className="ml-1 text-muted-foreground">
                    ({bucket.completed}/{bucket.total})
                </span>
            </span>
        </div>
    )
}

export function AdherencePanel({ data }: { data: AdherenceSummary }) {
    const labels = weekdayLabels()

    if (data.overall.total === 0) {
        return (
            <Card>
                <CardHeader className="border-b border-border/40 p-4">
                    <CardTitle className="text-sm font-bold">Aderência ao Cronograma</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <p className="text-pretty py-8 text-center text-xs text-muted-foreground">
                        Nenhuma sessão passada no período. A aderência aparece assim que houver
                        dias de cronograma já vencidos.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="enter">
            <CardHeader className="border-b border-border/40 p-4">
                <CardTitle className="text-sm font-bold">Aderência ao Cronograma</CardTitle>
                <CardDescription className="text-pretty text-xs text-muted-foreground">
                    Do que foi planejado, quanto realmente aconteceu — nos últimos{" "}
                    <span className="tabular-nums">{data.windowDays}</span>{" "}
                    {data.windowDays === 1 ? "dia" : "dias"}. Só dias já
                    vencidos entram na conta: uma sessão futura ainda não é uma falha.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 p-4">
                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-semibold tracking-tight num text-foreground">
                            {data.overall.rate === null ? "—" : <CountUp value={formatPercent(data.overall.rate)} />}
                        </span>
                        <span className="text-xs text-muted-foreground">de aderência geral</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        <span className="tabular-nums text-foreground">{data.overall.completed}</span>{" "}
                        concluídas ·{" "}
                        <span className="tabular-nums text-foreground">{data.overall.skipped}</span>{" "}
                        puladas ·{" "}
                        <span className="tabular-nums text-foreground">{data.overall.missed}</span>{" "}
                        não feitas
                    </p>
                </div>

                <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground">Por dia da semana</h3>
                    <div className="space-y-1.5">
                        {data.byWeekday.map((bucket) => (
                            <RateRow
                                key={bucket.key}
                                label={labels[Number(bucket.key)] ?? bucket.key}
                                bucket={bucket}
                            />
                        ))}
                    </div>
                </section>

                <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground">Por tipo de sessão</h3>
                    <div className="space-y-1.5">
                        {data.bySessionType.map((bucket) => (
                            <RateRow
                                key={bucket.key}
                                label={SESSION_TYPE_LABEL[bucket.key] ?? bucket.label}
                                bucket={bucket}
                            />
                        ))}
                    </div>
                </section>

                <section className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground">
                        Por disciplina{" "}
                        <span className="font-normal text-muted-foreground">(pior primeiro)</span>
                    </h3>
                    <div className="space-y-1.5">
                        {data.bySubject.map((bucket) => (
                            <RateRow key={bucket.key} label={bucket.label} bucket={bucket} />
                        ))}
                    </div>
                </section>

                <p className="text-pretty border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                    Aderência por hora do dia não é exibida: uma sessão não guarda horário
                    planejado — só <code className="font-mono">completed_at</code>, que existe
                    apenas nas concluídas — então qualquer taxa por hora teria um denominador
                    formado só de acertos.
                </p>
            </CardContent>
        </Card>
    )
}
