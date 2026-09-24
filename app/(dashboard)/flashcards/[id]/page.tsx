"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Archive, ArchiveRestore, ArrowLeft, Link2, Play, Trash2, X } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MarkdownPreview } from "@/components/notes/markdown-preview"
import { nativeSelectClass } from "@/components/flashcards/native-select"
import { formatExamLabel } from "@/lib/api/entities"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
    apiAddFlashcardLink, apiDeleteFlashcard, apiGetFlashcard, apiGetFlashcards, apiRemoveFlashcardLink, apiUpdateFlashcard,
    flashcardLabel, type Flashcard, type FlashcardDetail,
} from "@/lib/api/flashcards"

const GRADE_LABEL = { again: "Errei", hard: "Difícil", good: "Bom", easy: "Fácil" } as const

function FlashcardDetailInner() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const userId = useSearchParams().get("userId")
    const readOnly = !!userId
    const [card, setCard] = useState<FlashcardDetail | null>(null)
    const [others, setOthers] = useState<Flashcard[]>([])
    const [target, setTarget] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        try {
            setCard(await apiGetFlashcard(id, userId))
            setError(null)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Flashcard não encontrado.")
        }
    }, [id, userId])

    useEffect(() => { const t = setTimeout(() => void load()); return () => clearTimeout(t) }, [load])
    useEffect(() => { if (!readOnly) apiGetFlashcards().then(setOthers).catch(() => setOthers([])) }, [readOnly])

    async function act(fn: () => Promise<unknown>) {
        setBusy(true)
        try { await fn(); await load() } catch (err: unknown) { setError(err instanceof Error ? err.message : "Erro.") } finally { setBusy(false) }
    }

    if (error && !card) return <p className="text-sm text-destructive">{error}</p>
    if (!card) return <p className="text-sm text-muted-foreground">Carregando…</p>

    const linked = [
        ...card.outgoingLinks.map((l) => ({ ...l.targetCard, outgoing: true })),
        ...card.incomingLinks.map((l) => ({ ...l.sourceCard, outgoing: false })),
    ]
    const linkable = others.filter((o) => o.id !== card.id && !linked.some((l) => l.id === o.id))
    const withUser = (path: string) => (userId ? `${path}?userId=${userId}` : path)

    return (
        <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={withUser("/flashcards")} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-3.5 w-3.5" />Voltar para Flashcards
                </Link>
                {!readOnly && (
                    <div className="flex gap-2">
                        <Link href={`/flashcards/review?topicId=${card.topicId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                            <Play className="mr-1.5 h-3.5 w-3.5" />Revisar tópico
                        </Link>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => apiUpdateFlashcard(card.id, { isArchived: !card.isArchived }))}>
                            {card.isArchived ? <><ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />Desarquivar</> : <><Archive className="mr-1.5 h-3.5 w-3.5" />Arquivar</>}
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={async () => {
                            if (!window.confirm("Excluir este flashcard?")) return
                            await apiDeleteFlashcard(card.id)
                            router.push("/flashcards")
                        }}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Excluir</Button>
                    </div>
                )}
            </div>

            <Card>
                <CardContent className="space-y-4 p-5">
                    <p className="text-xs text-muted-foreground">
                        {card.topic.subject.name} · {card.topic.name}{card.exam ? ` · ${formatExamLabel(card.exam)}` : ""}
                    </p>
                    <div><p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Frente</p><MarkdownPreview content={card.front} /></div>
                    <div className="border-t pt-4"><p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Verso</p><MarkdownPreview content={card.back} /></div>
                    <p className="text-xs text-muted-foreground">
                        Intervalo {card.intervalDays} {card.intervalDays === 1 ? "dia" : "dias"} · próxima revisão {formatDateTime(card.dueAt)} · facilidade {card.easeFactor.toFixed(2)}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="py-3"><CardTitle className="flex items-center gap-1.5 text-sm"><Link2 className="h-4 w-4" />Flashcards vinculados</CardTitle></CardHeader>
                <CardContent className="space-y-2 pb-4">
                    {linked.length === 0 && <p className="text-xs text-muted-foreground">Nenhum vínculo.</p>}
                    {linked.map((l) => (
                        <div key={`${l.id}-${l.outgoing}`} className="flex items-center justify-between gap-2 text-sm">
                            <Link href={withUser(`/flashcards/${l.id}`)} className="hover:underline">{flashcardLabel(l.front)}</Link>
                            {!readOnly && l.outgoing && (
                                <button type="button" title="Remover vínculo" disabled={busy} onClick={() => act(() => apiRemoveFlashcardLink(card.id, l.id))} className="rounded p-1 text-muted-foreground hover:bg-muted cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                            )}
                        </div>
                    ))}
                    {!readOnly && linkable.length > 0 && (
                        <div className="flex gap-2 pt-2">
                            <select value={target} onChange={(e) => setTarget(e.target.value)} className={cn(nativeSelectClass, "min-w-0 flex-1")} aria-label="Vincular a outro flashcard">
                                <option value="">Vincular a outro flashcard…</option>
                                {linkable.map((o) => <option key={o.id} value={o.id}>{flashcardLabel(o.front)}</option>)}
                            </select>
                            <Button size="sm" disabled={!target || busy} onClick={() => act(async () => { await apiAddFlashcardLink(card.id, target); setTarget("") })}>Vincular</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Últimas revisões</CardTitle></CardHeader>
                <CardContent className="pb-4">
                    {card.reviews.length === 0 ? <p className="text-xs text-muted-foreground">Ainda não revisado.</p> : (
                        <ul className="space-y-1 text-xs">
                            {card.reviews.map((r) => (
                                <li key={r.id} className="flex justify-between"><span>{formatDateTime(r.reviewedAt)}</span><span>{GRADE_LABEL[r.grade]} → {r.intervalAfter} d</span></li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    )
}

export default function FlashcardDetailPage() {
    return <Suspense><FlashcardDetailInner /></Suspense>
}
