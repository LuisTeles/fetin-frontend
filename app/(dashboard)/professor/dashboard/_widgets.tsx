import { AlertTriangle, BookOpenCheck, CalendarCheck, GraduationCap, Users } from "lucide-react"
import type { ReactNode } from "react"

import { SessionExpired } from "@/app/(dashboard)/dashboard/_components/session-expired"
import { DisciplineRetentionChart, RetentionHistogram, WeakTopicsChart } from "@/components/dashboard/charts/lazy-charts"
import { StudentsTable } from "@/components/professor/students-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import type { ClassStudent, DashboardOverview, DisciplineRetention, WeakTopic } from "@/lib/api/professor"
import { formatPercent } from "@/lib/format"
import { getAnalytics, type AnalyticsResult } from "@/lib/server-data"

/** Same degradation as the student dashboard: renewal affordance for a stale session, message otherwise. */
function Failure({ result }: { result: Extract<AnalyticsResult<unknown>, { ok: false }> }) {
    if (result.sessionExpired) return <SessionExpired />
    return (
        <div role="status" aria-live="polite" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {result.error}
        </div>
    )
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <Card>
            <CardHeader className="border-b border-border/40 p-4">
                <CardTitle className="text-sm font-bold">{title}</CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
            </CardHeader>
            <CardContent className="p-4">{children}</CardContent>
        </Card>
    )
}

const pct = (v: number | null) => (v === null ? "—" : formatPercent(v))

function Kpi({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
    return (
        <Card>
            <CardHeader className="p-4 pb-0">
                <CardDescription className="flex items-center gap-1.5 text-xs [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}{label}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
                <p className="num text-2xl font-semibold">{value}</p>
                {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
            </CardContent>
        </Card>
    )
}

export async function OverviewWidget() {
    const r = await getAnalytics<DashboardOverview>("/professor/dashboard/overview")
    if (!r.ok) return <Failure result={r} />
    const o = r.data
    if (o.roster_size === 0) {
        return (
            <Card>
                <CardContent>
                    <EmptyState icon={<Users />} message="Sua turma ainda está vazia. Compartilhe o código da turma em Alunos para ver o painel." />
                </CardContent>
            </Card>
        )
    }
    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Kpi icon={<Users />} label="Alunos" value={String(o.roster_size)} hint={`${o.active_last_7d} ativos nos últimos 7 dias`} />
            <Kpi icon={<BookOpenCheck />} label="Retenção média" value={pct(o.avg_retention)} hint="dos tópicos já estudados" />
            <Kpi icon={<CalendarCheck />} label="Adesão (30 dias)" value={pct(o.avg_adherence)} hint="sessões concluídas / vencidas" />
            <Kpi icon={<AlertTriangle />} label="Em risco" value={String(o.at_risk_count)} hint="retenção < 50% ou 14 dias parado" />
            <Kpi icon={<GraduationCap />} label="Nota nas atividades" value={pct(o.avg_assignment_score_pct)} hint="média dos alunos que responderam" />
        </div>
    )
}

export async function RetentionWidgets() {
    const [subjects, students] = await Promise.all([
        getAnalytics<{ subjects: DisciplineRetention[] }>("/professor/dashboard/subjects"),
        getAnalytics<{ students: ClassStudent[] }>("/professor/dashboard/students"),
    ])
    if (!subjects.ok) return <Failure result={subjects} />
    if (!students.ok) return <Failure result={students} />

    // Distribution of each student's overall average, straight from the roster payload.
    const values = students.data.students.flatMap((s) => (s.avg_retention === null ? [] : [s.avg_retention]))
    const buckets = ["0-20", "20-40", "40-60", "60-80", "80-100"].map((bucket, i) => ({
        bucket,
        count: values.filter((v) => Math.min(4, Math.floor(v * 5)) === i).length,
    }))

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Retenção por disciplina" description="Média, entre quem estudou, da retenção de cada aluno. Verde ≥ 70%, âmbar ≥ 40%.">
                <DisciplineRetentionChart data={subjects.data.subjects} />
            </Panel>
            <Panel title="Distribuição da turma" description="Quantos alunos estão em cada faixa de retenção média.">
                <RetentionHistogram data={buckets} />
            </Panel>
        </div>
    )
}

export async function WeakTopicsWidget() {
    const r = await getAnalytics<{ topics: WeakTopic[] }>("/professor/dashboard/topics")
    if (!r.ok) return <Failure result={r} />
    return (
        <Panel title="Tópicos mais fracos da turma" description="Onde a memória da turma está mais baixa agora: bons candidatos a uma revisão em aula.">
            <WeakTopicsChart data={r.data.topics} />
        </Panel>
    )
}

export async function StudentsWidget() {
    const r = await getAnalytics<{ students: ClassStudent[] }>("/professor/dashboard/students")
    if (!r.ok) return <Failure result={r} />
    if (r.data.students.length === 0) return null
    return (
        <Panel title="Alunos" description="Em risco primeiro. Clique no nome para ver o detalhe ou envie uma atividade individual.">
            <StudentsTable students={r.data.students} />
        </Panel>
    )
}
