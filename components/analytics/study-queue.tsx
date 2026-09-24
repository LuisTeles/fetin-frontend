import { formatPercent } from "@/lib/format"
import { InfoTip } from "@/components/ui/info-tip"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

/**
 * The study queue: what to open next.
 *
 * A sorted table with one bar per row, not a chart — the job is identity plus one
 * magnitude, and a ranked list reads faster than any plot of the same data. A single
 * measure, so no legend; the risk value is direct-labelled instead.
 *
 * Server Component: no client JavaScript.
 */

export interface StudyQueueItem {
    topicId: string
    topicName: string
    subjectName: string
    weight: "essential" | "review" | "optional"
    currentRetention: number
    daysToExam: number | null
    /** Sessions of the topic in its active plan (from study_sessions); null when it has none. */
    sessionsPlanned: number | null
    sessionsDone: number | null
    /** D2: a completed topic whose review is due. */
    reviewDue: boolean
    risk: number
    riskBand: "low" | "medium" | "high"
}

const BAND: Record<StudyQueueItem["riskBand"], { label: string; color: string }> = {
    low: { label: "Baixa", color: "var(--status-good)" },
    medium: { label: "Média", color: "var(--status-warning)" },
    high: { label: "Alta", color: "var(--status-critical)" },
}

const WEIGHT_LABEL: Record<StudyQueueItem["weight"], string> = {
    essential: "Essencial",
    review: "Revisão",
    optional: "Opcional",
}

export function StudyQueue({ items }: { items: StudyQueueItem[] }) {
    if (items.length === 0) {
        return (
            <Card>
                <CardHeader className="border-b border-border/40 p-4">
                    <CardTitle className="text-sm font-bold">Fila de Estudo</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <p className="text-pretty py-8 text-center text-xs text-muted-foreground">
                        Nada na fila. Cadastre tópicos e provas para que a plataforma priorize
                        o que estudar.
                    </p>
                </CardContent>
            </Card>
        )
    }

    // Bars are relative to the worst item, so the ranking stays legible whatever the
    // absolute numbers are.
    const maxRisk = Math.max(...items.map((i) => i.risk), 0.0001)

    return (
        <Card className="enter">
            <CardHeader className="border-b border-border/40 p-4">
                <CardTitle className="text-sm font-bold">Fila de Estudo</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                    Tópicos ordenados por prioridade de estudo agora — retenção estimada, peso do
                    tópico, proximidade da prova e sessões que faltam. Tópicos já concluídos voltam
                    aqui quando a revisão vence.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <caption className="sr-only">
                            Tópicos ordenados da maior para a menor prioridade
                        </caption>
                        <thead>
                            <tr className="border-b border-border/40 text-left text-muted-foreground">
                                <th scope="col" className="p-3 font-medium">Tópico</th>
                                <th scope="col" className="p-3 font-medium">Peso</th>
                                <th scope="col" className="p-3 text-right font-medium">Retenção</th>
                                <th scope="col" className="p-3 text-right font-medium">Prova</th>
                                <th scope="col" className="p-3 text-right font-medium">
                                    <span className="inline-flex items-center justify-end gap-1">
                                        Sessões do plano
                                        <InfoTip id="queue-tip-sessions" align="right">
                                            Sessões concluídas sobre o total previsto no cronograma ativo. &quot;—&quot; se o tópico não está em nenhum cronograma ativo.
                                        </InfoTip>
                                    </span>
                                </th>
                                <th scope="col" className="p-3 font-medium">
                                    <span className="inline-flex items-center gap-1">
                                        Prioridade
                                        <InfoTip id="queue-tip-priority" align="right">
                                            Combina o quanto você já esqueceu, a importância do tópico, a proximidade da prova e as sessões que faltam. Quanto maior, mais urgente estudar. Escala 0–4.
                                        </InfoTip>
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr
                                    key={item.topicId}
                                    className="border-b border-border/20 last:border-0 hover:bg-muted/40"
                                >
                                    <td className="max-w-56 p-3">
                                        <div className="truncate font-medium text-foreground">
                                            {item.topicName}
                                        </div>
                                        <div className="truncate text-muted-foreground">
                                            {item.subjectName}
                                            {item.reviewDue && (
                                                <span className="ml-2 rounded-full bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                                                    Revisão pendente
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                        {WEIGHT_LABEL[item.weight]}
                                    </td>
                                    <td className="p-3 text-right tabular-nums text-foreground">
                                        {formatPercent(item.currentRetention)}
                                    </td>
                                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                                        {item.daysToExam === null ? "—" : `${item.daysToExam}d`}
                                    </td>
                                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                                        {item.sessionsPlanned === null
                                            ? "—"
                                            : `${item.sessionsDone ?? 0}/${item.sessionsPlanned}`}
                                    </td>
                                    <td className="w-32 p-3">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                                                role="img"
                                                title={`Pontuação ${item.risk.toFixed(2)} (escala 0–4)`}
                                                aria-label={`Prioridade ${BAND[item.riskBand].label} (pontuação ${item.risk.toFixed(2)})`}
                                            >
                                                <div
                                                    className="bar-fill h-full rounded-full"
                                                    style={{
                                                        width: `${(item.risk / maxRisk) * 100}%`,
                                                        background: BAND[item.riskBand].color,
                                                    }}
                                                />
                                            </div>
                                            <span
                                                className="w-12 shrink-0 font-medium text-foreground"
                                                title={`Pontuação ${item.risk.toFixed(2)} (escala 0–4)`}
                                            >
                                                {BAND[item.riskBand].label}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
