"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Layers } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { MarkdownPreview } from "@/components/notes/markdown-preview"
import { apiGetDueFlashcards, apiGetFlashcards, apiReviewFlashcard, FlashcardApiError, type Flashcard, type FlashcardGrade, type TopicRollup } from "@/lib/api/flashcards"

const GRADES: { grade: FlashcardGrade; label: string; key: string; variant: "destructive" | "outline" | "default" | "secondary" }[] = [
    { grade: "again", label: "Errei", key: "1", variant: "destructive" },
    { grade: "hard", label: "Difícil", key: "2", variant: "outline" },
    { grade: "good", label: "Bom", key: "3", variant: "default" },
    { grade: "easy", label: "Fácil", key: "4", variant: "secondary" },
]

function rollupMessage(r: TopicRollup): string {
    if (r.advanced) return `Tópico revisado: próxima revisão em ${r.intervalAfter} ${r.intervalAfter === 1 ? "dia" : "dias"}.`
    if (r.accuracy < 0.7) return `Tópico mantido: acerto de ${Math.round(r.accuracy * 100)}% (mínimo 70%).`
    return "Tópico já avançou hoje; esta revisão foi registrada."
}

/** RN-FLC-05: the rollup needs min(5, active cards) distinct cards graded in a day. */
const ROLLUP_MAX_CARDS = 5

/**
 * A spaced-review session links to the topic's rollup (RN-FLC-07), but card SM-2 intervals
 * drift from the topic ladder, so only 1-4 cards may be due that day. Top the queue up with
 * the topic's soonest-due active cards so the rollup can fire; due cards stay first.
 */
function topUpForSession(due: Flashcard[], topicCards: Flashcard[]): Flashcard[] {
    const target = Math.min(ROLLUP_MAX_CARDS, topicCards.length)
    if (due.length >= target) return due
    const inQueue = new Set(due.map((c) => c.id))
    const extra = topicCards
        .filter((c) => !inQueue.has(c.id))
        .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    return [...due, ...extra.slice(0, target - due.length)]
}

function ReviewInner() {
    const sp = useSearchParams()
    const topicId = sp.get("topicId") ?? undefined
    const examId = sp.get("examId") ?? undefined
    const [sessionId, setSessionId] = useState(sp.get("sessionId"))
    const openedWithSession = sp.get("sessionId") !== null
    // Read by load() without making it a dependency: completing the session mid-review must
    // not reload the queue.
    const sessionRef = useRef(sessionId)
    useEffect(() => { sessionRef.current = sessionId }, [sessionId])

    const [queue, setQueue] = useState<Flashcard[] | null>(null)
    const [index, setIndex] = useState(0)
    const [revealed, setRevealed] = useState(false)
    // Mirrors `revealed` synchronously, so a key pressed before the re-render cannot grade
    // the card that was just graded.
    const revealedRef = useRef(false)
    const [busy, setBusy] = useState(false)
    const busyRef = useRef(false)
    const [tally, setTally] = useState({ total: 0, hits: 0 })
    const [notice, setNotice] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            const due = await apiGetDueFlashcards({ topicId, examId, limit: 100 })
            // Active cards only (the list default).
            const topicCards = sessionRef.current && topicId ? await apiGetFlashcards({ topicId }) : null
            setQueue(topicCards ? topUpForSession(due, topicCards) : due)
            setError(null)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao carregar revisões.")
        }
    }, [topicId, examId])

    useEffect(() => { const t = setTimeout(() => void load()); return () => clearTimeout(t) }, [load])

    const current = queue?.[index]

    const reveal = useCallback(() => {
        revealedRef.current = true
        setRevealed(true)
    }, [])

    // Hide the answer and move on; the ref flips first so no stale handler can re-grade.
    const advance = useCallback(() => {
        revealedRef.current = false
        setRevealed(false)
        setIndex((i) => i + 1)
    }, [])

    const grade = useCallback(async (g: FlashcardGrade) => {
        if (!current || !revealedRef.current || busyRef.current) return
        busyRef.current = true
        setBusy(true)
        try {
            // Each grade is saved immediately, so leaving mid-review loses nothing.
            const res = await apiReviewFlashcard(current.id, g, sessionId)
            advance()
            setTally((t) => ({ total: t.total + 1, hits: t.hits + (g === "good" || g === "easy" ? 1 : 0) }))
            if (res.rollup) setNotice(rollupMessage(res.rollup) + (res.sessionCompleted ? " Sessão concluída." : ""))
            else if (res.sessionCompleted) setNotice("Sessão concluída: o tópico já tinha sido revisado hoje.")
            if (res.sessionCompleted) setSessionId(null)
            setError(null)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Erro ao registrar revisão."
            // Deleted (404) or archived (409) elsewhere: skip it instead of getting stuck.
            if (err instanceof FlashcardApiError && (err.status === 404 || err.status === 409)) advance()
            setError(message)
        } finally {
            busyRef.current = false
            setBusy(false)
        }
    }, [current, sessionId, advance])

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
            const t = e.target
            if (
                t instanceof HTMLInputElement ||
                t instanceof HTMLTextAreaElement ||
                t instanceof HTMLSelectElement ||
                (t instanceof HTMLElement && t.isContentEditable)
            ) return
            if (e.code === "Space" && !revealedRef.current) { e.preventDefault(); reveal(); return }
            const hit = GRADES.find((x) => x.key === e.key)
            if (hit) void grade(hit.grade)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [grade, reveal])

    const back = (
        <Link href="/flashcards" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />Voltar para Flashcards
        </Link>
    )

    if (error && !queue) return <div className="space-y-4">{back}<p className="text-sm text-destructive">{error}</p></div>
    if (!queue) return <p className="text-sm text-muted-foreground">Carregando…</p>

    if (queue.length === 0) {
        return (
            <div className="space-y-4">{back}
                <EmptyState icon={<Layers className="h-6 w-6" />} message="Nada para revisar agora."
                    action={<Link href={`/flashcards?new=1${topicId ? `&topicId=${topicId}` : ""}`} className={buttonVariants({ size: "sm" })}>Criar flashcard</Link>} />
            </div>
        )
    }

    if (!current) {
        const pct = tally.total ? Math.round((tally.hits / tally.total) * 100) : 0
        return (
            <div className="mx-auto max-w-xl space-y-4">{back}
                <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <p className="text-sm font-semibold">Revisão concluída</p>
                    <p className="text-xs text-muted-foreground">{tally.total} {tally.total === 1 ? "card" : "cards"} · {pct}% de acerto</p>
                    {notice && <p className="text-xs">{notice}</p>}
                    {openedWithSession && sessionId && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                            A sessão de estudo ainda está pendente — revise mais cards do tópico ou conclua-a em Sessões.
                        </p>
                    )}
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <div className="flex gap-2 pt-2">
                        <Link href="/flashcards" className={buttonVariants({ variant: "outline", size: "sm" })}>Voltar</Link>
                        <Button size="sm" onClick={() => { setQueue(null); setIndex(0); revealedRef.current = false; setRevealed(false); setTally({ total: 0, hits: 0 }); setNotice(null); setError(null); void load() }}>Revisar mais</Button>
                    </div>
                </CardContent></Card>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-xl space-y-4">
            <div className="flex items-center justify-between">{back}<span className="text-xs text-muted-foreground">{index + 1} / {queue.length}</span></div>
            {notice && <p role="status" className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{notice}</p>}
            <Card>
                <CardContent className="space-y-4 p-6">
                    <p className="text-xs text-muted-foreground">{current.topic.subject.name} · {current.topic.name}</p>
                    <MarkdownPreview content={current.front} />
                    {revealed && <div className="border-t pt-4"><MarkdownPreview content={current.back} /></div>}
                </CardContent>
            </Card>
            {!revealed ? (
                <Button className="w-full" onClick={reveal}>Mostrar resposta <kbd className="ml-2 text-[10px] opacity-70">Espaço</kbd></Button>
            ) : (
                <div className="grid grid-cols-4 gap-2">
                    {GRADES.map((g) => (
                        <Button key={g.grade} variant={g.variant} disabled={busy} onClick={() => grade(g.grade)}>
                            {g.label} <kbd className="ml-1 text-[10px] opacity-70">{g.key}</kbd>
                        </Button>
                    ))}
                </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    )
}

export default function FlashcardReviewPage() {
    return <Suspense><ReviewInner /></Suspense>
}
