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
 * Session-type effectiveness — the app checking its own premise against its own data.
 *
 * The headline metric is **recall at the moment of review**, not stability gain. Gain is
 * driven by the RN-RET-03 ladder, which advances on completion count rather than session
 * type, so comparing gain across types mostly reveals where in the ladder each type lands.
 * Recall-at-review is the number that describes behaviour: reviewing at 90% means arriving
 * too early and spending a session for almost nothing.
 *
 * Server Component: no chart library, no client JS.
 */

export interface EffectivenessBucket {
    sessionType: string
    reviews: number
    avgRetentionAtReview: number
    avgStabilityBefore: number
    avgStabilityAfter: number
    avgStabilityGain: number
    avgIntervalAfter: number
}

export interface EffectivenessSummary {
    /** Reviews only: a topic's first study is a "first contact", not a review. */
    totalReviews: number
    firstContacts: number
    /** Share of reviews with recall within ±15 points of the 50% target; null with no reviews. */
    nearTarget: { reviews: number; share: number | null }
    bySessionType: EffectivenessBucket[]
    causalityCaveat: true
}

const LABEL: Record<string, string> = {
    new_content: "Conteúdo novo",
    spaced_review: "Revisão espaçada",
    pre_exam_review: "Revisão pré-prova",
    flashcards: "Flashcards",
}

/** The ladder targets 50% recall at review; flag drift in either direction. */
function timingVerdict(sessionType: string, recall: number): string | null {
    if (sessionType === "new_content") return null // first contact, recall is 0 by definition
    if (recall >= 0.75) return "cedo demais — a memória ainda estava forte"
    if (recall <= 0.25) return "tarde demais — já havia esquecido"
    return "no alvo (~50%)"
}

export function EffectivenessPanel({ data }: { data: EffectivenessSummary }) {
    if (data.totalReviews === 0 && data.firstContacts === 0) {
        return (
            <Card>
                <CardHeader className="border-b border-border/40 p-4">
                    <CardTitle className="text-sm font-bold">Eficácia das Revisões</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <p className="text-pretty py-8 text-center text-xs text-muted-foreground">
                        Ainda não há revisões registradas. Conclua sessões do cronograma para que a
                        plataforma avalie o próprio método.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="enter">
            <CardHeader className="border-b border-border/40 p-4">
                <CardTitle className="text-sm font-bold">Eficácia das Revisões</CardTitle>
                <CardDescription className="text-pretty text-xs text-muted-foreground">
                    Em que ponto da curva você revisa, por tipo de sessão (todo o histórico) —{" "}
                    <span className="tabular-nums">{data.totalReviews}</span>{" "}
                    {data.totalReviews === 1 ? "revisão registrada" : "revisões registradas"}. O alvo do método é revisar por volta de 50% de retenção.
                </CardDescription>
                <p className="mt-1 text-xs text-foreground">
                    <span className="font-medium">% de revisões perto de 50%:</span>{" "}
                    <span className="tabular-nums">
                        {data.nearTarget.share === null ? "—" : formatPercent(data.nearTarget.share)}
                    </span>
                    {data.nearTarget.share !== null && (
                        <span className="text-muted-foreground">
                            {" "}({data.nearTarget.reviews} de {data.totalReviews}, entre 35% e 65% de retenção)
                        </span>
                    )}
                </p>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <caption className="sr-only">
                            Métricas de revisão agrupadas por tipo de sessão
                        </caption>
                        <thead>
                            <tr className="border-b border-border/40 text-left text-muted-foreground">
                                <th scope="col" className="p-3 font-medium">Tipo</th>
                                <th scope="col" className="p-3 text-right font-medium">Revisões</th>
                                <th scope="col" className="p-3 text-right font-medium">Retenção na revisão</th>
                                <th scope="col" className="p-3 font-medium">Timing</th>
                                <th scope="col" className="p-3 text-right font-medium">Intervalo médio</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-border/20">
                                <td className="p-3 font-medium text-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        Primeiro contato
                                        <InfoTip id="eff-tip-first">
                                            Estudo inicial não tem retenção anterior para medir. A retenção só faz sentido em revisões.
                                        </InfoTip>
                                    </span>
                                </td>
                                <td className="p-3 text-right tabular-nums text-muted-foreground">{data.firstContacts}</td>
                                <td className="p-3 text-right text-muted-foreground">—</td>
                                <td className="p-3 text-muted-foreground">—</td>
                                <td className="p-3 text-right text-muted-foreground">—</td>
                            </tr>
                            {data.bySessionType.map((b) => {
                                const verdict = timingVerdict(b.sessionType, b.avgRetentionAtReview)
                                return (
                                    <tr key={b.sessionType} className="border-b border-border/20 last:border-0">
                                        <td className="p-3 font-medium text-foreground">
                                            {LABEL[b.sessionType] ?? b.sessionType}
                                        </td>
                                        <td className="p-3 text-right tabular-nums text-muted-foreground">
                                            {b.reviews}
                                        </td>
                                        <td className="p-3 text-right tabular-nums text-foreground">
                                            {formatPercent(b.avgRetentionAtReview)}
                                        </td>
                                        <td className="p-3 text-muted-foreground">{verdict ?? "—"}</td>
                                        <td className="p-3 text-right tabular-nums text-muted-foreground">
                                            {b.avgIntervalAfter}d
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <p className="text-pretty border-t border-border/40 p-3 text-[11px] text-muted-foreground">
                    O ganho de estabilidade não é comparado entre tipos: ele é determinado pela
                    escada de intervalos (RN-RET-03), que avança pela contagem de conclusões e não
                    pelo tipo da sessão. Comparar ganhos mediria onde cada tipo cai na escada, não
                    um efeito do tipo.
                </p>
            </CardContent>
        </Card>
    )
}
