"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Layers } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { MarkdownPreview } from "@/components/notes/markdown-preview"
import { apiGetDueFlashcards, apiReviewFlashcard, type Flashcard, type FlashcardGrade, type TopicRollup } from "@/lib/api/flashcards"

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

function ReviewInner() {
    const sp = useSearchParams()
    const topicId = sp.get("topicId") ?? undefined
    const examId = sp.get("examId") ?? undefined
    const [sessionId, setSessionId] = useState(sp.get("sessionId"))

    const [queue, setQueue] = useState<Flashcard[] | null>(null)
    const [index, setIndex] = useState(0)
    const [revealed, setRevealed] = useState(false)
    const [busy, setBusy] = useState(false)
    const [tally, setTally] = useState({ total: 0, hits: 0 })
    const [notice, setNotice] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            setQueue(await apiGetDueFlashcards({ topicId, examId, limit: 100 }))
            setError(null)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao carregar revisões.")
        }
    }, [topicId, examId])

    useEffect(() => { const t = setTimeout(() => void load()); return () => clearTimeout(t) }, [load])

    const current = queue?.[index]

    const grade = useCallback(async (g: FlashcardGrade) => {
        if (!current || !revealed || busy) return
        setBusy(true)
        try {
            // Each grade is saved immediately, so leaving mid-review loses nothing.
            const res = await apiReviewFlashcard(current.id, g, sessionId)
            setTally((t) => ({ total: t.total + 1, hits: t.hits + (g === "good" || g === "easy" ? 1 : 0) }))
            if (res.rollup) setNotice(rollupMessage(res.rollup) + (res.sessionCompleted ? " Sessão concluída." : ""))
            if (res.sessionCompleted) setSessionId(null)
            setIndex((i) => i + 1)
            setRevealed(false)
            setError(null)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao registrar revisão.")
        } finally {
            setBusy(false)
        }
    }, [current, revealed, busy, sessionId])

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
            if (e.code === "Space" && !revealed) { e.preventDefault(); setRevealed(true); return }
            const hit = GRADES.find((x) => x.key === e.key)
            if (hit) void grade(hit.grade)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [grade, revealed])

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
                    <div className="flex gap-2 pt-2">
                        <Link href="/flashcards" className={buttonVariants({ variant: "outline", size: "sm" })}>Voltar</Link>
                        <Button size="sm" onClick={() => { setQueue(null); setIndex(0); setTally({ total: 0, hits: 0 }); void load() }}>Revisar mais</Button>
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
                <Button className="w-full" onClick={() => setRevealed(true)}>Mostrar resposta <kbd className="ml-2 text-[10px] opacity-70">Espaço</kbd></Button>
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
