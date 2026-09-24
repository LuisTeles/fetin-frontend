import Link from "next/link"
import { Check, GraduationCap, Layers, SkipForward } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import type { StudySessionType } from "@/lib/api/schedules"
import { formatDateShort, formatMinutes, pluralize } from "@/lib/format"
import { sessionActions, type AgendaExam, type AgendaSession } from "@/lib/session-agenda"
import { daysBetween } from "@/lib/time"
import { cn } from "@/lib/utils"

const SESSION_TYPE_LABEL: Record<StudySessionType, string> = {
    new_content: "Conteúdo novo",
    spaced_review: "Revisão",
    pre_exam_review: "Pré-prova",
}

export function SessionRow({
    item,
    busy,
    readOnly,
    onStatus,
    showDate = false,
}: {
    item: AgendaSession
    busy: boolean
    /** Impersonating: the backend rejects writes, so no buttons. */
    readOnly: boolean
    onStatus: (sessionId: string, status: "completed" | "skipped") => void
    showDate?: boolean
}) {
    const { session } = item
    const finished = session.status !== "pending"
    const actions = sessionActions(session, readOnly)

    return (
        <li
            className={cn(
                "flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                finished && "opacity-60",
            )}
        >
            <div className="flex min-w-0 items-start gap-3">
                <span className="w-12 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {showDate ? formatDateShort(item.date) : (session.plannedStartTime ?? "—")}
                </span>
                <div className="min-w-0">
                    <p className={cn("truncate text-sm font-medium", session.status === "completed" && "line-through")}>
                        {session.topic?.name ?? "Tópico"}
                    </p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {item.subjectName && <span>{item.subjectName}</span>}
                        <Badge variant="outline">{SESSION_TYPE_LABEL[session.sessionType]}</Badge>
                        <span>{formatMinutes(session.durationMinutes)}</span>
                        {session.status === "skipped" && <span>· pulada</span>}
                    </p>
                </div>
            </div>

            {actions.length > 0 && (
                <div className="flex shrink-0 gap-1.5 self-end sm:self-auto">
                    {session.sessionType === "spaced_review" && actions.includes("completed") && (
                        <Link
                            href={`/flashcards/review?topicId=${session.topicId}&sessionId=${session.id}`}
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                            <Layers /> Revisar com cards
                        </Link>
                    )}
                    {actions.includes("skipped") && (
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onStatus(session.id, "skipped")}>
                            <SkipForward /> Pular
                        </Button>
                    )}
                    {actions.includes("completed") && (
                        <Button size="sm" disabled={busy} onClick={() => onStatus(session.id, "completed")}>
                            <Check /> Concluir
                        </Button>
                    )}
                </div>
            )}
        </li>
    )
}

export function ExamRow({ item, today, userId }: { item: AgendaExam; today: string; userId: string | null }) {
    const days = daysBetween(today, item.date)
    const countdown = days === 0 ? "hoje" : days === 1 ? "amanhã" : `em ${pluralize(days, "dia", "dias")}`
    const href = userId ? `/exams?userId=${userId}` : "/exams"

    return (
        <li>
            <Link
                href={href}
                className="flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5 transition-colors hover:bg-muted"
            >
                <span className="flex min-w-0 items-center gap-3">
                    <GraduationCap className="size-4 shrink-0 text-brand" />
                    <span className="truncate text-sm font-medium">Prova · {item.subjectName}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateShort(item.date)} · {countdown}
                </span>
            </Link>
        </li>
    )
}
