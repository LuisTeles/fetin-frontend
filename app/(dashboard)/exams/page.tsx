"use client"

import { useState } from "react"
import { Calendar, AlertCircle, RefreshCw, CheckCircle2, Clock } from "lucide-react"
import { ExamList } from "@/components/dashboard/exam-list"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ExamsPage() {
    const [stats, setStats] = useState({ count: 0, pendingCount: 0 })

    return (
        <section className="space-y-6">
            {/* Header / Welcome Area */}
            <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Provas e Avaliações</h1>
                <p className="text-xs text-muted-foreground">
                    Gerencie suas provas agendadas e associe tópicos de estudos para automatizar a geração de cronogramas.
                </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <Card className="border-border/60 bg-card shadow-xs">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                            Provas Cadastradas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-tight">{stats.count}</span>
                        <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card shadow-xs">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                            Provas com Pendências
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-tight">{stats.pendingCount}</span>
                        <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card shadow-xs">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                            Status da Sincronização
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-foreground shrink-0" />
                            Sincronizado
                        </span>
                        <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 grid-cols-1">
                <Card className="border-border/60 bg-card shadow-xs">
                    <CardHeader className="p-4 border-b border-border/40">
                        <CardTitle className="text-sm font-bold">Calendário de Avaliações</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Agende provas para suas disciplinas e conecte os tópicos de estudo exigidos por cada uma delas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        <ExamList onStatsChange={setStats} />
                    </CardContent>
                </Card>
            </div>
        </section>
    )
}
