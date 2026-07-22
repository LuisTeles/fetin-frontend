"use client"

import { useState } from "react"
import { Calendar, BookOpen, CheckSquare, Clock } from "lucide-react"
import { CalendarView } from "@/components/dashboard/calendar-view"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CalendarPage() {
    const [stats, setStats] = useState({ tasksCount: 0, examsCount: 0, studySessionsCount: 0, routineBlocksCount: 0 })

    return (
        <section className="space-y-6">
            {/* Header / Title Area */}
            <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Calendário Acadêmico</h1>
                <p className="text-xs text-muted-foreground">
                    Acompanhe suas tarefas, compromissos fixos da rotina, provas agendadas e sessões de estudo.
                </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                <Card className="border-border/60 bg-card shadow-xs">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                            Minhas Tarefas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-tight">{stats.tasksCount}</span>
                        <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                            <CheckSquare className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card shadow-xs">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                            Provas Ativas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-tight">{stats.examsCount}</span>
                        <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card shadow-xs">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                            Compromissos de Rotina
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-tight">{stats.routineBlocksCount}</span>
                        <div className="rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
                            <Calendar className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card shadow-xs">
                    <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                            Sessões de Estudo
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex items-center justify-between">
                        <span className="text-2xl font-bold tracking-tight">{stats.studySessionsCount}</span>
                        <div className="rounded-md bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
                            <Clock className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Calendar View Component */}
            <Card className="border-border/60 bg-card shadow-xs">
                <CardHeader className="p-4 border-b border-border/40">
                    <CardTitle className="text-sm font-bold">Grade de Compromissos</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        Navegue pelas visualizações Mensal, Semanal ou Diária.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                    <CalendarView onStatsChange={setStats} />
                </CardContent>
            </Card>
        </section>
    )
}
