"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, RefreshCw } from "lucide-react"

import { fetchDashboardSummary, type DashboardSummary } from "@/lib/api/dashboard"
import { SparklineKpiCards } from "@/components/dashboard/sparkline-kpis"
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap"
import { BulletChart } from "@/components/dashboard/bullet-chart"
import { DivergingBars } from "@/components/dashboard/diverging-bars"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="border-border/60">
                        <CardHeader className="p-4 pb-0">
                            <Skeleton className="h-3 w-24" />
                        </CardHeader>
                        <CardContent className="p-4 pt-2 space-y-2">
                            <Skeleton className="h-7 w-16" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            {/* Heatmap */}
            <Card className="border-border/60">
                <CardHeader className="p-4 border-b border-border/40">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64 mt-1" />
                </CardHeader>
                <CardContent className="p-4">
                    <Skeleton className="h-72 w-full" />
                </CardContent>
            </Card>
            {/* Bottom row */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border/60">
                    <CardHeader className="p-4 border-b border-border/40">
                        <Skeleton className="h-4 w-40" />
                    </CardHeader>
                    <CardContent className="p-4">
                        <Skeleton className="h-52 w-full" />
                    </CardContent>
                </Card>
                <Card className="border-border/60">
                    <CardHeader className="p-4 border-b border-border/40">
                        <Skeleton className="h-4 w-40" />
                    </CardHeader>
                    <CardContent className="p-4">
                        <Skeleton className="h-52 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const searchParams = useSearchParams()
    const impersonateUserId = searchParams.get("userId")

    const [data, setData] = useState<DashboardSummary | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<string | null>(null)

    async function load() {
        setIsLoading(true)
        setError(null)
        try {
            const summary = await fetchDashboardSummary(impersonateUserId)
            setData(summary)
            setLastUpdated(
                new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            )
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erro ao carregar dados do dashboard.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [impersonateUserId])

    return (
        <section className="space-y-6">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                        Diagnóstico de Estudos
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Visualize padrões de burnout, cronogramas negligenciados e tendências de desempenho.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {lastUpdated && (
                        <span className="text-[10px] text-muted-foreground">
                            Atualizado: {lastUpdated}
                        </span>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={load}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* ── Error state ──────────────────────────────────────────────── */}
            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 text-xs"
                        onClick={load}
                    >
                        Tentar novamente
                    </Button>
                </div>
            )}

            {isLoading && !data ? (
                <DashboardSkeleton />
            ) : data ? (
                <>
                    {/* ── 1. Sparkline KPIs ──────────────────────────────── */}
                    <SparklineKpiCards data={data.kpis} />

                    {/* ── 2. Weekly Activity Heatmap ──────────────────────── */}
                    <Card className="border-border/60 bg-card shadow-xs">
                        <CardHeader className="p-4 border-b border-border/40">
                            <CardTitle className="text-sm font-bold">
                                Mapa de Calor de Atividade Semanal
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">
                                Distribuição de minutos estudados por hora do dia e dia da semana (últimas 8 semanas).
                                Identifica blocos de alta intensidade e voids de procrastinação.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            <ActivityHeatmap data={data.heatmapData} />
                        </CardContent>
                    </Card>

                    {/* ── 3. Bullet + Diverging grid ─────────────────────── */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Target vs Actual Bullet Chart */}
                        <Card className="border-border/60 bg-card shadow-xs">
                            <CardHeader className="p-4 border-b border-border/40">
                                <CardTitle className="text-sm font-bold">
                                    Meta vs. Realidade por Disciplina
                                </CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">
                                    Sessões concluídas versus total alocado. Barras vermelhas revelam disciplinas negligenciadas.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4">
                                <BulletChart data={data.bulletData} />
                            </CardContent>
                        </Card>

                        {/* Diverging Habit Bars */}
                        <Card className="border-border/60 bg-card shadow-xs">
                            <CardHeader className="p-4 border-b border-border/40">
                                <CardTitle className="text-sm font-bold">
                                    Consistência de Hábitos (Divergente)
                                </CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">
                                    Delta diário entre minutos estudados e planejados. Vermelho = déficit, verde = superou o plano.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4">
                                <DivergingBars data={data.divergingData} />
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : null}
        </section>
    )
}
