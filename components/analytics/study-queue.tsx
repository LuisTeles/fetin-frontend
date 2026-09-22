import { formatPercent } from "@/lib/format"
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
    sessionsAllocated: number
    sessionsCompleted: number
    risk: number
}

const WEIGHT_LABEL: Record<StudyQueueItem["weight"], string> = {
    essential: "Essencial",
    review: "Revisão",
    optional: "Opcional",
}

export function StudyQueue({ items }: { items: StudyQueueItem[] }) {
    if (items.length === 0) {
        return (
            <Card className="border-border/60 bg-card shadow-xs">
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
        <Card className="border-border/60 bg-card shadow-xs">
            <CardHeader className="border-b border-border/40 p-4">
                <CardTitle className="text-sm font-bold">Fila de Estudo</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                    Tópicos ordenados por risco — retenção estimada, peso do tópico, proximidade
                    da prova e sessões ainda não cumpridas.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <caption className="sr-only">
                            Tópicos ordenados do maior para o menor risco
                        </caption>
                        <thead>
                            <tr className="border-b border-border/40 text-left text-muted-foreground">
                                <th scope="col" className="p-3 font-medium">Tópico</th>
                                <th scope="col" className="p-3 font-medium">Peso</th>
                                <th scope="col" className="p-3 text-right font-medium">Retenção</th>
                                <th scope="col" className="p-3 text-right font-medium">Prova</th>
                                <th scope="col" className="p-3 text-right font-medium">Sessões</th>
                                <th scope="col" className="p-3 font-medium">Risco</th>
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
                                        {item.sessionsCompleted}/{item.sessionsAllocated}
                                    </td>
                                    <td className="w-32 p-3">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                                                role="img"
                                                aria-label={`Risco ${item.risk.toFixed(2)}`}
                                            >
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${(item.risk / maxRisk) * 100}%`,
                                                        background: "var(--status-warning)",
                                                    }}
                                                />
                                            </div>
                                            <span className="shrink-0 tabular-nums text-muted-foreground">
                                                {item.risk.toFixed(2)}
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
