"use client"

import { ResponsiveLine } from "@nivo/line"

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
}

export function RetentionCurveChart({ series }: { series: CurveSeries[] }) {
    const { theme, isDark } = useNivoTheme()
    const reducedMotion = useReducedMotion()
    const colors = categoricalPalette(isDark)

    const data = series.map((s) => ({
        id: s.topicName,
        data: s.points.map((p) => ({ x: p.date.slice(0, 10), y: p.retention })),
    }))

    return (
        <div className="h-72 w-full">
            <ResponsiveLine
                data={data}
                theme={theme}
                colors={colors as string[]}
                margin={{ top: 12, right: 24, bottom: 56, left: 44 }}
                xScale={{ type: "point" }}
                yScale={{ type: "linear", min: 0, max: 1 }}
                curve="monotoneX"
                axisBottom={{
                    tickRotation: -45,
                    // A tick per sample would be unreadable; show roughly six.
                    tickValues: data[0]?.data.filter((_, i) => i % Math.ceil((data[0]?.data.length || 1) / 6) === 0).map((d) => d.x),
                    legendOffset: 46,
                }}
                axisLeft={{
                    format: (v) => `${Math.round(Number(v) * 100)}%`,
                    tickValues: [0, 0.25, 0.5, 0.75, 1],
                }}
                enableGridX={false}
                enablePoints={false}
                lineWidth={2}
                useMesh
                animate={!reducedMotion}
                legends={[
                    {
                        anchor: "bottom",
                        direction: "row",
                        translateY: 54,
                        itemWidth: 130,
                        itemHeight: 14,
                        symbolSize: 8,
                        symbolShape: "circle",
                    },
                ]}
            />
        </div>
    )
}
