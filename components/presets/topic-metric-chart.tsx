"use client"

import { ResponsiveBar } from "@nivo/bar"

import { useNivoTheme } from "@/lib/nivo-theme"
import { useReducedMotion } from "@/lib/use-reduced-motion"

export interface MetricRow {
    name: string
    /** 0..1, or null when there is no data for this topic (no bar is drawn). */
    value: number | null
    /** Extra line in the tooltip, e.g. "2 de 6 sessões". */
    detail?: string
}

const pct = (v: number) => `${Math.round(v * 100)}%`

/**
 * One measure across topics, one axis (0–100%), one hue. Rows without data draw no bar and
 * are never shown as 0%: "nobody studied this" and "no data" are different statements.
 * The metric switcher above the chart picks the measure, so two scales never share an axis.
 */
export function TopicMetricChart({ rows, metricLabel }: { rows: MetricRow[]; metricLabel: string }) {
    const { theme, brand } = useNivoTheme()
    const reducedMotion = useReducedMotion()
    const data = rows.map((r) => ({ name: r.name, value: r.value ?? 0, has: r.value === null ? 0 : 1, detail: r.detail ?? "" }))
    // The value rides on the category label so it is always readable, even for empty or tiny bars.
    const valueOf = new Map(rows.map((r) => [r.name, r.value === null ? "—" : pct(r.value)]))

    return (
        <div style={{ height: Math.max(160, rows.length * 38 + 56) }} role="img" aria-label={`${metricLabel} por tópico`}>
            <ResponsiveBar
                data={data}
                keys={["value"]}
                indexBy="name"
                layout="horizontal"
                valueScale={{ type: "linear", min: 0, max: 1 }}
                margin={{ top: 8, right: 24, bottom: 36, left: 220 }}
                padding={0.55}
                borderRadius={4}
                colors={brand}
                enableGridY={false}
                enableGridX
                gridXValues={[0, 0.25, 0.5, 0.75, 1]}
                axisBottom={{ format: (v: number) => pct(v), tickValues: [0, 0.25, 0.5, 0.75, 1] }}
                axisLeft={{ tickSize: 0, tickPadding: 8, format: (name: string) => `${name}  ·  ${valueOf.get(name) ?? ""}` }}
                enableLabel={false}
                animate={!reducedMotion}
                theme={theme}
                tooltip={({ data: d }) => (
                    <div style={{ ...(theme.tooltip?.container as object), padding: "6px 10px" }}>
                        <strong>{d.name}</strong>
                        <div>{metricLabel}: {d.has === 1 ? pct(Number(d.value)) : "sem dados"}</div>
                        {d.detail && <div style={{ opacity: 0.75 }}>{String(d.detail)}</div>}
                    </div>
                )}
            />
        </div>
    )
}
