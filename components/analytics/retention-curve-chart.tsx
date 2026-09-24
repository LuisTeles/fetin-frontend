"use client"

import { formatDayMonth } from "@/lib/format"
import { ResponsiveLine, type LineCustomSvgLayerProps } from "@nivo/line"

import { categoricalPalette } from "@/lib/chart-palette"
import { useNivoTheme } from "@/lib/nivo-theme"
import { useReducedMotion } from "@/lib/use-reduced-motion"

/**
 * Forgetting curves, reconstructed from the review log.
 *
 * A line chart is right here: the job is change-over-time, and the shape *is* the message —
 * each review visibly flattens the decay. One axis (retention, 0–1); series colours come
 * from the validated categorical palette in fixed order, so hiding a topic never repaints
 * the others.
 *
 * Capped at four series upstream, which is also the point at which a legend plus direct
 * reading stays honest. Nivo ships the crosshair and tooltip the form requires.
 */

export interface CurveSeries {
    topicId: string
    topicName: string
    points: { date: string; retention: number }[]
    reviews?: { occurredAt: string }[]
    /** Retention right now, 0–1. */
    current?: number
}

type ChartSeries = { id: string; data: { x: string; y: number }[] }

export function RetentionCurveChart({ series }: { series: CurveSeries[] }) {
    const { theme, isDark } = useNivoTheme()
    const reducedMotion = useReducedMotion()
    const colors = categoricalPalette(isDark)

    // Below this the memory is due for review — the line the curve should never sink under.
    const REVIEW_THRESHOLD = 0.5

    const data = series.map((s) => ({
        id: s.topicName,
        data: s.points.map((p) => ({ x: p.date.slice(0, 10), y: p.retention })),
    }))

    // One dot per review, sitting on the curve at the review date (or the nearest sample).
    const reviewDates = new Map(
        series.map((s) => [s.topicName, (s.reviews ?? []).map((r) => r.occurredAt.slice(0, 10))]),
    )
    const ReviewMarkers = ({ series: lineSeries, xScale, yScale }: LineCustomSvgLayerProps<ChartSeries>) => (
        <g>
            {lineSeries.map((line) => {
                const pts: { x: string; y: number }[] = line.data.map((d) => d.data as { x: string; y: number })
                return (reviewDates.get(String(line.id)) ?? []).map((date: string, i: number) => {
                    const p = pts.find((q) => q.x === date) ?? pts.find((q) => q.x >= date) ?? pts[pts.length - 1]
                    if (!p) return null
                    return (
                        <circle
                            key={`${line.id}-${i}`}
                            cx={xScale(p.x)}
                            cy={yScale(p.y)}
                            r={4}
                            fill={line.color}
                            stroke="var(--card)"
                            strokeWidth={2}
                        />
                    )
                })
            })}
        </g>
    )

    return (
        <div>
            <ul className="mb-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {series.map((s, i) => (
                    <li key={s.topicId} className="flex min-w-0 items-center gap-2 text-xs">
                        <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: colors[i] }}
                        />
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground" title={s.topicName}>
                            {s.topicName}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                            {s.reviews?.length ?? 0} rev.
                            {s.current !== undefined && <> · agora {Math.round(s.current * 100)}%</>}
                        </span>
                    </li>
                ))}
            </ul>
            <p className="mb-1 text-[11px] text-muted-foreground">
                <span aria-hidden="true">●</span> cada ponto é uma revisão — a curva volta a subir e cai mais devagar.
            </p>
            <div className="chart-reveal h-72 w-full">
                <ResponsiveLine
                    data={data}
                    theme={theme}
                    colors={colors as string[]}
                    margin={{ top: 12, right: 24, bottom: 48, left: 44 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: 0, max: 1 }}
                    curve="monotoneX"
                    axisBottom={{
                        tickRotation: -35,
                        format: (v) => formatDayMonth(String(v)),
                        // A tick per sample would be unreadable; show roughly six.
                        tickValues: data[0]?.data
                            .filter((_, i) => i % Math.ceil((data[0]?.data.length || 1) / 6) === 0)
                            .map((d) => d.x),
                        legendOffset: 40,
                    }}
                    axisLeft={{
                        format: (v) => `${Math.round(Number(v) * 100)}%`,
                        tickValues: [0, 0.25, 0.5, 0.75, 1],
                    }}
                    markers={[
                        {
                            axis: "y",
                            value: REVIEW_THRESHOLD,
                            lineStyle: {
                                stroke: "#9ca3af",
                                strokeWidth: 1,
                                strokeDasharray: "4 4",
                            },
                            legend: "hora de revisar",
                            legendPosition: "bottom-right",
                            textStyle: { fill: "#6b7280", fontSize: 10 },
                        },
                    ]}
                    enableGridX={false}
                    enablePoints={false}
                    lineWidth={2}
                    useMesh
                    animate={!reducedMotion}
                    layers={["grid", "markers", "axes", "lines", ReviewMarkers, "crosshair", "mesh"]}
                />
            </div>
        </div>
    )
}
