"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useReducer } from "react"
import { AlertCircle, CalendarCheck2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
    fetchExamsList,
    fetchUserSchedules,
    updateSessionStatus,
    type Exam,
    type Schedule,
} from "@/lib/api/schedules"
import { formatDateShort, pluralize } from "@/lib/format"
import {
    agendaReducer,
    agendaView,
    buildAgenda,
    initialAgendaState,
    type AgendaItem,
} from "@/lib/session-agenda"
import { addDays, localToday } from "@/lib/time"

import { ExamRow, SessionRow } from "./agenda-rows"

const HORIZON_DAYS = 7

function fetchAgenda(userId: string | null): Promise<[Schedule[], Exam[]]> {
    return Promise.all([fetchUserSchedules(userId), fetchExamsList(userId)])
}

export function SessionAgenda() {
    const userId = useSearchParams().get("userId")
    // Admin impersonation is read-only on the backend (every non-GET is a 403), so offer no actions.
    const readOnly = userId !== null
    const [state, dispatch] = useReducer(agendaReducer, initialAgendaState)
    const { loading, error, busy } = state

    /** Applies a fetch result; `isCurrent` drops a response that a newer request superseded. */
    const track = useCallback((request: Promise<[Schedule[], Exam[]]>, isCurrent: () => boolean) => {
        return request.then(
            ([schedules, exams]) => {
                if (isCurrent()) dispatch({ type: "loaded", schedules, exams })
            },
            (err: unknown) => {
                if (isCurrent()) {
                    dispatch({ type: "loadFailed", message: err instanceof Error ? err.message : "Falha ao carregar a agenda." })
                }
            },
        )
    }, [])

    useEffect(() => {
        let current = true
        void track(fetchAgenda(userId), () => current)
        return () => {
            current = false
        }
    }, [track, userId])

    const load = useCallback(() => {
        dispatch({ type: "reload" })
        return track(fetchAgenda(userId), () => true)
    }, [track, userId])

    const today = localToday()
    const agenda = useMemo(
        () => buildAgenda(state.schedules, state.exams, { today, horizonEnd: addDays(today, HORIZON_DAYS) }),
        [state.schedules, state.exams, today],
    )

    async function handleStatus(sessionId: string, status: "completed" | "skipped") {
        dispatch({ type: "statusStart", sessionId, status })
        try {
            await updateSessionStatus(sessionId, status, userId)
            dispatch({ type: "statusDone" })
        } catch (err) {
            const message = err instanceof Error ? err.message : "Falha ao atualizar a sessão."
            dispatch({ type: "statusFailed", sessionId, message })
            // the server may already hold a different status (400 "já finalizada"); this reload keeps the message
            void track(fetchAgenda(userId), () => true)
        }
    }

    const renderItem = (item: AgendaItem, showDate = false) =>
        item.kind === "exam" ? (
            <ExamRow key={`exam-${item.id}`} item={item} today={today} userId={userId} />
        ) : (
            <SessionRow
                key={item.session.id}
                item={item}
                showDate={showDate}
                busy={busy}
                readOnly={readOnly}
                onStatus={handleStatus}
            />
        )

    const view = agendaView(state, agenda)

    if (view === "loading") {
        return (
            <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        )
    }

    if (view === "failed") {
        return (
            <Alert variant="destructive">
                <AlertCircle />
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                    <span>{error}</span>
                    <Button size="sm" variant="outline" onClick={() => void load()}>
                        <RefreshCw /> Tentar de novo
                    </Button>
                </AlertDescription>
            </Alert>
        )
    }

    const nothing = view === "empty"

    const withUser = (path: string) => (userId ? `${path}?userId=${userId}` : path)

    return (
        <div className="space-y-4">
            {error && (
                <Alert variant="destructive">
                    <AlertCircle />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {agenda.staleCount > 0 && (
                <Alert>
                    <AlertCircle />
                    <AlertDescription>
                        {pluralize(agenda.staleCount, "plano está desatualizado", "planos estão desatualizados")} porque a
                        prova mudou. Gere de novo em{" "}
                        <Link className="underline" href={withUser("/auto-schedule")}>
                            Calendário Automático
                        </Link>
                        .
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => void load()} disabled={loading}>
                    <RefreshCw className={loading ? "animate-spin" : undefined} /> Atualizar
                </Button>
            </div>

            {nothing ? (
                <Card>
                    <EmptyState
                        icon={<CalendarCheck2 />}
                        message="Nenhuma sessão ou prova pela frente. Cadastre uma prova e gere um plano de estudos."
                        action={
                            <div className="flex gap-2">
                                <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={withUser("/exams")}>
                                    Provas
                                </Link>
                                <Link className={buttonVariants({ size: "sm" })} href={withUser("/auto-schedule")}>
                                    Calendário Automático
                                </Link>
                            </div>
                        }
                    />
                </Card>
            ) : (
                <>
                    {agenda.overdue.length > 0 && (
                        <Card>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-bold text-destructive">Atrasadas</CardTitle>
                                <CardDescription className="text-xs">
                                    {pluralize(agenda.overdue.length, "sessão pendente", "sessões pendentes")} de dias anteriores
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <ul className="space-y-2">{agenda.overdue.map((i) => renderItem(i, true))}</ul>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-bold">Hoje · {formatDateShort(today)}</CardTitle>
                            <CardDescription className="text-xs">
                                {agenda.todayProgress.total > 0
                                    ? `${agenda.todayProgress.done} de ${agenda.todayProgress.total} concluídas`
                                    : "Nenhuma sessão planejada para hoje"}
                            </CardDescription>
                        </CardHeader>
                        {agenda.today.length > 0 && (
                            <CardContent className="p-4 pt-0">
                                <ul className="space-y-2">{agenda.today.map((i) => renderItem(i))}</ul>
                            </CardContent>
                        )}
                    </Card>

                    {agenda.upcoming.length > 0 && (
                        <Card>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-bold">Próximos {HORIZON_DAYS} dias</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 p-4 pt-0">
                                {agenda.upcoming.map((day) => (
                                    <section key={day.date} className="space-y-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            {formatDateShort(day.date)}
                                        </h3>
                                        <ul className="space-y-2">{day.items.map((i) => renderItem(i))}</ul>
                                    </section>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {agenda.later.length > 0 && (
                        <Card>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-sm font-bold">Próximas provas</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <ul className="space-y-2">{agenda.later.map((i) => renderItem(i))}</ul>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    )
}
