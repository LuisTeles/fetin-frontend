"use client"

import { ResponsiveHeatMapCanvas } from "@nivo/heatmap"
import type { HeatmapRow } from "@/lib/api/dashboard"
import { ChartEmptyState } from "./chart-empty-state"
import { useNivoTheme } from "@/lib/nivo-theme"

interface ActivityHeatmapProps {
    data: HeatmapRow[]
}

const SHOWN_HOURS = [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
    "19:00", "20:00", "21:00", "22:00", "23:00",
]

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
    const { theme, isDark } = useNivoTheme()

    const hasData = data.some((row) => row.data.some((d) => d.y > 0))

    if (!hasData) {
        return (
            <ChartEmptyState
                title="Nenhum histórico de atividade"
                description="Conclua sessões de estudo para ver a distribuição de tempo semanal."
            />
        )
    }

    const filteredData = data.filter((row) => SHOWN_HOURS.includes(row.id))

    return (
        <div className="h-72 w-full">
            <ResponsiveHeatMapCanvas
                data={filteredData}
                theme={theme}
                margin={{ top: 20, right: 20, bottom: 40, left: 52 }}
                axisTop={null}
                axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    legend: "",
                    legendOffset: 0,
                }}
                axisBottom={{
                    tickSize: 0,
                    tickPadding: 8,
                    legend: "",
                    legendOffset: 32,
                }}
                colors={
                    isDark
                        ? {
                              type: "sequential",
                              colors: ["#18181b", "#c084fc"],
                              minValue: 0,
                          }
                        : {
                              type: "sequential",
                              colors: ["#f4f4f5", "#7e22ce"],
                              minValue: 0,
                          }
                }
                emptyColor={isDark ? "#18181b" : "#f4f4f5"}
                borderColor={isDark ? "#27272a" : "#e4e4e7"}
                borderWidth={1}
                enableLabels={false}
                tooltip={({ cell }) => (
                    <div className="rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md">
                        <span className="font-semibold text-popover-foreground">{cell.serieId}</span>
                        <span className="text-muted-foreground"> — {cell.data.x}</span>
                        <span className="ml-2 font-bold text-primary">{cell.value} min</span>
                    </div>
                )}
                animate={true}
            />
        </div>
    )
}
