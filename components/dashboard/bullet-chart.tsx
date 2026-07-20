"use client"

import { ResponsiveBullet } from "@nivo/bullet"
import type { BulletDatum } from "@/lib/api/dashboard"
import { ChartEmptyState } from "./chart-empty-state"
import { useNivoTheme } from "@/lib/nivo-theme"

interface BulletChartProps {
    data: BulletDatum[]
}

export function BulletChart({ data }: BulletChartProps) {
    const { theme, isDark } = useNivoTheme()

    if (!data || data.length === 0) {
        return (
            <ChartEmptyState
                title="Nenhuma disciplina com cronograma"
                description="Crie um cronograma para acompanhar o progresso por disciplina."
                ctaLabel="Gerar Cronograma"
                ctaHref="/auto-schedule"
            />
        )
    }

    const height = Math.max(280, data.length * 80 + 40)

    const coloredData = data.map((d) => {
        const pct = d.measures[0]
        const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444"
        const formattedTitle = d.id.length > 25 ? `${d.id.slice(0, 23)}...` : d.id
        return {
            ...d,
            id: formattedTitle,
            fullTitle: d.id,
            measureColor: color,
        }
    })

    const rangeColors = isDark
        ? ["rgba(239, 68, 68, 0.25)", "rgba(245, 158, 11, 0.25)", "rgba(16, 185, 129, 0.25)"]
        : ["#fee2e2", "#fef3c7", "#d1fae5"]

    return (
        <div style={{ height }} className="w-full">
            <ResponsiveBullet
                data={coloredData}
                theme={theme}
                margin={{ top: 20, right: 36, bottom: 40, left: 210 }}
                spacing={60}
                titleAlign="start"
                titleOffsetX={-200}
                titleOffsetY={0}
                rangeColors={rangeColors}
                measureColors={coloredData.map((d) => d.measureColor)}
                markerColors={[isDark ? "#a5b4fc" : "#6366f1"]}
                measureSize={0.55}
                markerSize={0.75}
                tooltip={({ v0, v1, color }) => (
                    <div className="rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md space-y-0.5">
                        <p className="font-semibold text-popover-foreground">
                            Progresso:{" "}
                            <span style={{ color }}>{v0 ?? v1}%</span>
                        </p>
                    </div>
                )}
                animate={true}
            />
        </div>
    )
}
