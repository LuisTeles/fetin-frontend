"use client"

import { ResponsiveBar } from "@nivo/bar"

import { ChartEmptyState } from "@/components/dashboard/chart-empty-state"
import { useNivoTheme } from "@/lib/nivo-theme"
import { useReducedMotion } from "@/lib/use-reduced-motion"
import { statusPalette } from "@/lib/chart-palette"
import type { DisciplineRetention, RetentionBucket, WeakTopic } from "@/lib/api/professor"

/** Retention colour: labelled everywhere it appears, so colour is never the only signal. */
function retentionColour(value: number, isDark: boolean) {
    const p = statusPalette(isDark)
    return value >= 0.7 ? p.good : value >= 0.4 ? p.warning : p.critical
}

function Empty({ title, description }: { title: string; description: string }) {
    return <ChartEmptyState title={title} description={description} ctaLabel="" ctaHref="" />
}

/** Average retention per discipline, weakest first. Indexed by the (unique) discipline name. */
export function DisciplineRetentionChart({ data }: { data: DisciplineRetention[] }) {
    const { theme, isDark } = useNivoTheme()
    const reduced = useReducedMotion()
    const rows = data
        .filter((d) => d.avg_retention !== null)
        .sort((a, b) => (b.avg_retention as number) - (a.avg_retention as number))
        .map((d) => ({ name: d.name, retention: Math.round((d.avg_retention as number) * 100), students: d.student_count }))
    if (rows.length === 0) return <Empty title="Sem retenção ainda" description="Assim que os alunos estudarem, a retenção por disciplina aparece aqui." />

    return (
        <div className="w-full" style={{ height: Math.max(160, rows.length * 44 + 40) }}>
            <ResponsiveBar
                data={rows}
                theme={theme}
                keys={["retention"]}
                indexBy="name"
                layout="horizontal"
                margin={{ top: 8, right: 48, bottom: 28, left: 160 }}
                padding={0.35}
                valueScale={{ type: "linear", min: 0, max: 100 }}
                colors={({ data: d }) => retentionColour((d.retention as number) / 100, isDark)}
                borderRadius={3}
                axisLeft={{ tickSize: 0, tickPadding: 8 }}
                axisBottom={{ tickSize: 0, tickPadding: 6, format: (v) => `${v}%` }}
                enableGridX
                enableGridY={false}
                label={(d) => `${d.value}%`}
                labelTextColor="#ffffff"
                animate={!reduced}
                tooltip={({ data: d }) => (
                    <div className="rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md">
                        <p className="font-semibold text-popover-foreground">{d.name as string}</p>
                        <p className="text-muted-foreground">Retenção média: {d.retention as number}%</p>
                        <p className="text-muted-foreground">Alunos que estudaram: {d.students as number}</p>
                    </div>
                )}
            />
        </div>
    )
}

/** How many students fall in each retention fifth (per-student average, all disciplines). */
export function RetentionHistogram({ data }: { data: RetentionBucket[] }) {
    const { theme, isDark } = useNivoTheme()
    const reduced = useReducedMotion()
    if (data.every((b) => b.count === 0)) return <Empty title="Sem alunos com estudo" description="A distribuição aparece quando ao menos um aluno estudar." />
    const rows = data.map((b, i) => ({ bucket: `${b.bucket}%`, alunos: b.count, mid: (i * 20 + 10) / 100 }))
    return (
        <div className="h-64 w-full">
            <ResponsiveBar
                data={rows}
                theme={theme}
                keys={["alunos"]}
                indexBy="bucket"
                margin={{ top: 16, right: 16, bottom: 40, left: 40 }}
                padding={0.25}
                valueScale={{ type: "linear", min: 0 }}
                colors={({ data: d }) => retentionColour(d.mid as number, isDark)}
                borderRadius={3}
                axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4, format: (v) => (Number.isInteger(v) ? String(v) : "") }}
                axisBottom={{ tickSize: 0, tickPadding: 6, legend: "Retenção média do aluno", legendPosition: "middle", legendOffset: 32 }}
                enableGridY
                label={(d) => (d.value ? String(d.value) : "")}
                labelTextColor="#ffffff"
                animate={!reduced}
                tooltip={({ data: d }) => (
                    <div className="rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md">
                        <p className="font-semibold text-popover-foreground">Faixa {d.bucket as string}</p>
                        <p className="text-muted-foreground">{d.alunos as number} aluno(s)</p>
                    </div>
                )}
            />
        </div>
    )
}

/** The class's weakest topics. Indexed by subject|topic, never by the (repeatable) topic name. */
export function WeakTopicsChart({ data }: { data: WeakTopic[] }) {
    const { theme, isDark } = useNivoTheme()
    const reduced = useReducedMotion()
    if (data.length === 0) return <Empty title="Sem tópicos estudados" description="Os tópicos mais fracos da turma aparecem depois dos primeiros estudos." />
    const rows = data.map((t) => ({ key: `${t.subject}|${t.topic}`, label: t.topic, subject: t.subject, retention: Math.round(t.avg_retention * 100), students: t.student_count }))
    return (
        <div className="w-full" style={{ height: Math.max(160, rows.length * 40 + 40) }}>
            <ResponsiveBar
                data={rows}
                theme={theme}
                keys={["retention"]}
                indexBy="key"
                layout="horizontal"
                margin={{ top: 8, right: 48, bottom: 28, left: 200 }}
                padding={0.35}
                valueScale={{ type: "linear", min: 0, max: 100 }}
                colors={({ data: d }) => retentionColour((d.retention as number) / 100, isDark)}
                borderRadius={3}
                axisLeft={{
                    tickSize: 0,
                    tickPadding: 8,
                    format: (key) => {
                        const label = String(key).split("|").slice(1).join("|")
                        return label.length > 28 ? `${label.slice(0, 27)}…` : label
                    },
                }}
                axisBottom={{ tickSize: 0, tickPadding: 6, format: (v) => `${v}%` }}
                enableGridX
                enableGridY={false}
                label={(d) => `${d.value}%`}
                labelTextColor="#ffffff"
                animate={!reduced}
                tooltip={({ data: d }) => (
                    <div className="rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md">
                        <p className="font-semibold text-popover-foreground">{d.label as string}</p>
                        <p className="text-muted-foreground">{d.subject as string}</p>
                        <p className="text-muted-foreground">Retenção média: {d.retention as number}% · {d.students as number} aluno(s)</p>
                    </div>
                )}
            />
        </div>
    )
}

/** Completed / due per weekday for one student (0 = Sunday). */
export function WeekdayAdherenceChart({ data }: { data: { weekday: number; completed: number; total: number }[] }) {
    const { theme, isDark } = useNivoTheme()
    const reduced = useReducedMotion()
    const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    if (data.every((d) => d.total === 0)) return <Empty title="Sem sessões vencidas" description="A adesão por dia da semana aparece depois das primeiras sessões planejadas." />
    const rows = data.map((d) => ({ day: labels[d.weekday], Concluídas: d.completed, "Não feitas": d.total - d.completed }))
    const p = statusPalette(isDark)
    return (
        <div className="h-56 w-full">
            <ResponsiveBar
                data={rows}
                theme={theme}
                keys={["Concluídas", "Não feitas"]}
                indexBy="day"
                margin={{ top: 12, right: 12, bottom: 32, left: 36 }}
                padding={0.3}
                colors={({ id }) => (id === "Concluídas" ? p.good : p.critical)}
                borderRadius={2}
                axisLeft={{ tickSize: 0, tickPadding: 8, tickValues: 4, format: (v) => (Number.isInteger(v) ? String(v) : "") }}
                axisBottom={{ tickSize: 0, tickPadding: 6 }}
                enableLabel={false}
                animate={!reduced}
            />
        </div>
    )
}
