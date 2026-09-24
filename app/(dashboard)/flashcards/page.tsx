"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Layers, Plus, Play, Search, X } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { FlashcardForm } from "@/components/flashcards/flashcard-form"
import { FlashcardTile } from "@/components/flashcards/flashcard-tile"
import { nativeSelectClass } from "@/components/flashcards/native-select"
import { apiGetTags, type Tag } from "@/lib/api/notes"
import { apiGetTopics, type TopicEntity } from "@/lib/api/entities"
import { apiGetDueFlashcards, apiGetFlashcards, type Flashcard } from "@/lib/api/flashcards"

function FlashcardsPageInner() {
    const router = useRouter()
    const sp = useSearchParams()
    const userId = sp.get("userId")
    const readOnly = !!userId

    const [cards, setCards] = useState<Flashcard[]>([])
    const [dueCount, setDueCount] = useState(0)
    const [tags, setTags] = useState<Tag[]>([])
    const [topics, setTopics] = useState<TopicEntity[]>([])
    const [topicId, setTopicId] = useState(sp.get("topicId") ?? "")
    const [tagId, setTagId] = useState("")
    const [q, setQ] = useState("")
    const [includeArchived, setIncludeArchived] = useState(false)
    const [editing, setEditing] = useState<Flashcard | "new" | null>(sp.get("new") && !readOnly ? "new" : null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const defaults = useMemo(() => ({
        topicId: sp.get("topicId") ?? undefined,
        examId: sp.get("examId") ?? undefined,
        back: sp.get("back") ?? undefined,
    }), [sp])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [list, due] = await Promise.all([
                apiGetFlashcards({ topicId: topicId || undefined, tagId: tagId || undefined, q: q.trim() || undefined, includeArchived, userId }),
                apiGetDueFlashcards({ limit: 200, userId }),
            ])
            setCards(list)
            setDueCount(due.length)
            setError(null)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao carregar flashcards.")
        } finally {
            setLoading(false)
        }
    }, [topicId, tagId, q, includeArchived, userId])

    useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])
    useEffect(() => {
        apiGetTags(userId).then(setTags).catch(() => setTags([]))
        apiGetTopics(undefined, userId).then(setTopics).catch(() => setTopics([]))
    }, [userId])

    const withUser = (path: string) => (userId ? `${path}${path.includes("?") ? "&" : "?"}userId=${userId}` : path)

    function handleSaved() {
        setEditing(null)
        if (sp.get("new")) router.replace(withUser("/flashcards"))
        void load()
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold">Flashcards</h1>
                    <p className="text-sm text-muted-foreground">{dueCount} {dueCount === 1 ? "card para revisar" : "cards para revisar"} hoje</p>
                </div>
                <div className="flex gap-2">
                    {!readOnly && (
                        <Button size="sm" variant="outline" onClick={() => setEditing("new")} className="cursor-pointer">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />Novo flashcard
                        </Button>
                    )}
                    {dueCount > 0 && !readOnly ? (
                        <Link href="/flashcards/review" className={buttonVariants({ size: "sm" })}>
                            <Play className="mr-1.5 h-3.5 w-3.5" />Revisar
                        </Link>
                    ) : (
                        <Button size="sm" disabled>
                            <Play className="mr-1.5 h-3.5 w-3.5" />Revisar
                        </Button>
                    )}
                </div>
            </div>

            {editing && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between border-b py-3">
                        <CardTitle className="text-sm">{editing === "new" ? "Novo flashcard" : "Editar flashcard"}</CardTitle>
                        <button type="button" onClick={() => setEditing(null)} className="rounded p-1 text-muted-foreground hover:bg-muted cursor-pointer"><X className="h-4 w-4" /></button>
                    </CardHeader>
                    <CardContent className="p-4">
                        <FlashcardForm
                            key={editing === "new" ? "new" : editing.id}
                            card={editing === "new" ? undefined : editing}
                            tags={tags}
                            defaults={editing === "new" ? defaults : undefined}
                            onSuccess={handleSaved}
                            onCancel={() => setEditing(null)}
                        />
                    </CardContent>
                </Card>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar na frente e no verso" className="h-9 w-64 pl-8 text-xs" />
                </div>
                <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className={nativeSelectClass} aria-label="Filtrar por tópico">
                    <option value="">Todos os tópicos</option>
                    {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={tagId} onChange={(e) => setTagId(e.target.value)} className={nativeSelectClass} aria-label="Filtrar por tag">
                    <option value="">Todas as tags</option>
                    {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
                    Incluir arquivados
                </label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {!loading && cards.length === 0 ? (
                <EmptyState icon={<Layers className="h-6 w-6" />} message="Nenhum flashcard ainda. Crie o primeiro a partir de um tópico." />
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {cards.map((c) => (
                        <FlashcardTile key={c.id} card={c} href={withUser(`/flashcards/${c.id}`)} onEdit={readOnly ? undefined : () => setEditing(c)} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function FlashcardsPage() {
    return (
        <Suspense>
            <FlashcardsPageInner />
        </Suspense>
    )
}
