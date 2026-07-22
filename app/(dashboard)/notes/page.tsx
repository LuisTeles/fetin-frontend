"use client"

import { useState, useEffect, useCallback } from "react"
import {
    Plus,
    StickyNote,
    Tag as TagIcon,
    Archive,
    X,
    Loader2,
    Filter,
    Search,
    RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { NoteCard } from "@/components/notes/note-card"
import { NoteForm } from "@/components/notes/note-form"
import { TagManager } from "@/components/notes/tag-manager"
import { TagBadge } from "@/components/notes/tag-badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
    type Note,
    type Tag,
    apiGetNotes,
    apiGetTags,
    apiUpdateNote,
    apiDeleteNote,
} from "@/lib/api/notes"
import { cn } from "@/lib/utils"

type View = "list" | "create" | "edit" | "tags"

export default function NotesPage() {
    // ── Data state ────────────────────────────────────────────────────────────
    const [notes, setNotes] = useState<Note[]>([])
    const [tags, setTags] = useState<Tag[]>([])
    const [isLoadingNotes, setIsLoadingNotes] = useState(true)
    const [isLoadingTags, setIsLoadingTags] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)

    // ── UI state ──────────────────────────────────────────────────────────────
    const [view, setView] = useState<View>("list")
    const [editingNote, setEditingNote] = useState<Note | null>(null)

    // ── Filters ───────────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)
    const [showArchived, setShowArchived] = useState(false)

    // ── Load data ─────────────────────────────────────────────────────────────
    const loadNotes = useCallback(async (includeArchived = false) => {
        setIsLoadingNotes(true)
        setLoadError(null)
        try {
            const data = await apiGetNotes({ includeArchived })
            setNotes(data)
        } catch (err: unknown) {
            setLoadError(err instanceof Error ? err.message : "Erro ao carregar notas.")
        } finally {
            setIsLoadingNotes(false)
        }
    }, [])

    const loadTags = useCallback(async () => {
        setIsLoadingTags(true)
        try {
            const data = await apiGetTags()
            setTags(data)
        } catch {
            // Tags failing silently — don't block the page
        } finally {
            setIsLoadingTags(false)
        }
    }, [])

    useEffect(() => {
        loadNotes(showArchived)
        loadTags()
    }, [loadNotes, loadTags, showArchived])

    // ── Derived filtered list ─────────────────────────────────────────────────
    const filteredNotes = notes.filter((note) => {
        if (activeTagFilter && !note.tags.some((nt) => nt.tagId === activeTagFilter)) return false
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            const titleMatch = note.title?.toLowerCase().includes(q)
            const contentMatch = note.content.toLowerCase().includes(q)
            if (!titleMatch && !contentMatch) return false
        }
        return true
    })

    // ── Handlers ──────────────────────────────────────────────────────────────
    function handleCreateSuccess(note: Note) {
        setNotes((prev) => [note, ...prev])
        setView("list")
    }

    function handleEditSuccess(updated: Note) {
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
        setEditingNote(null)
        setView("list")
    }

    function handleEdit(note: Note) {
        setEditingNote(note)
        setView("edit")
    }

    async function handleDelete(id: string) {
        try {
            await apiDeleteNote(id)
            setNotes((prev) => prev.filter((n) => n.id !== id))
        } catch (err: unknown) {
            setLoadError(err instanceof Error ? err.message : "Erro ao excluir nota.")
        }
    }

    async function handleArchiveToggle(note: Note) {
        try {
            const updated = await apiUpdateNote(note.id, { isArchived: !note.isArchived })
            setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
        } catch (err: unknown) {
            setLoadError(err instanceof Error ? err.message : "Erro ao arquivar nota.")
        }
    }

    const activeTagName = tags.find((t) => t.id === activeTagFilter)
    const archivedCount = notes.filter((n) => n.isArchived).length
    const activeCount = notes.filter((n) => !n.isArchived).length

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <section className="space-y-6">
            {/* ── Page Header ── */}
            <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Notas Rápidas</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Capture insights e vincule-os às suas disciplinas, tópicos e provas.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            size="sm"
                            variant={view === "tags" ? "default" : "outline"}
                            onClick={() => setView(view === "tags" ? "list" : "tags")}
                            className="cursor-pointer"
                        >
                            <TagIcon className="h-3.5 w-3.5 mr-1.5" />
                            <span className="hidden sm:inline">Gerenciar Tags</span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setView(view === "create" ? "list" : "create")}
                            className="cursor-pointer"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Nova Nota
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Stats row ── */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                <Card className="border-border/60 bg-card shadow-xs">
                    <CardHeader className="p-3 pb-0.5">
                        <CardDescription className="text-[10px] uppercase font-semibold tracking-wider">
                            Notas Ativas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 flex items-center justify-between">
                        <span className="text-2xl font-bold">{activeCount}</span>
                        <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                            <StickyNote className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/60 bg-card shadow-xs">
                    <CardHeader className="p-3 pb-0.5">
                        <CardDescription className="text-[10px] uppercase font-semibold tracking-wider">
                            Tags Criadas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 flex items-center justify-between">
                        <span className="text-2xl font-bold">{tags.length}</span>
                        <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                            <TagIcon className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/60 bg-card shadow-xs col-span-2 sm:col-span-1">
                    <CardHeader className="p-3 pb-0.5">
                        <CardDescription className="text-[10px] uppercase font-semibold tracking-wider">
                            Arquivadas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 flex items-center justify-between">
                        <span className="text-2xl font-bold">{archivedCount}</span>
                        <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                            <Archive className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {loadError && (
                <Alert variant="destructive">
                    <AlertDescription className="text-xs">{loadError}</AlertDescription>
                </Alert>
            )}

            {/* ── Create / Edit / Tag Manager panel ── */}
            {(view === "create" || view === "edit" || view === "tags") && (
                <Card className="border-border/60 bg-card shadow-xs">
                    <CardHeader className="p-4 border-b border-border/40">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold">
                                {view === "create"
                                    ? "Nova Nota"
                                    : view === "edit"
                                      ? "Editar Nota"
                                      : "Gerenciar Tags"}
                            </CardTitle>
                            <button
                                type="button"
                                onClick={() => { setView("list"); setEditingNote(null) }}
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        {view === "create" && (
                            <NoteForm
                                tags={tags}
                                notes={notes}
                                onSuccess={handleCreateSuccess}
                                onCancel={() => setView("list")}
                            />
                        )}
                        {view === "edit" && editingNote && (
                            <NoteForm
                                note={editingNote}
                                tags={tags}
                                notes={notes}
                                onSuccess={handleEditSuccess}
                                onCancel={() => { setView("list"); setEditingNote(null) }}
                            />
                        )}
                        {view === "tags" && (
                            <TagManager />
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ── Notes list ── */}
            {view !== "tags" && (
                <div className="space-y-3">
                    {/* Filters bar */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Buscar por título ou conteúdo…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-8 text-xs"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Tag filter pills */}
                            {tags.slice(0, 6).map((tag) => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => setActiveTagFilter(activeTagFilter === tag.id ? null : tag.id)}
                                    className="cursor-pointer transition-all"
                                    title={`Filtrar por ${tag.name}`}
                                >
                                    <TagBadge
                                        name={tag.name}
                                        color={tag.color}
                                        size="md"
                                        className={cn(
                                            "transition-opacity",
                                            activeTagFilter && activeTagFilter !== tag.id && "opacity-40",
                                        )}
                                    />
                                </button>
                            ))}

                            {/* Archive toggle */}
                            <button
                                type="button"
                                onClick={() => setShowArchived((v) => !v)}
                                className={cn(
                                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border transition-all cursor-pointer",
                                    showArchived
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "border-border text-muted-foreground hover:border-foreground/40",
                                )}
                            >
                                <Archive className="h-3 w-3" />
                                Arquivadas
                            </button>

                            {/* Refresh */}
                            <button
                                type="button"
                                onClick={() => loadNotes(showArchived)}
                                disabled={isLoadingNotes}
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                                title="Recarregar"
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", isLoadingNotes && "animate-spin")} />
                            </button>
                        </div>
                    </div>

                    {/* Active filter indicator */}
                    {(activeTagFilter || searchQuery) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Filter className="h-3 w-3" />
                            <span>
                                {filteredNotes.length} nota{filteredNotes.length !== 1 ? "s" : ""}
                                {activeTagName && <> com tag <TagBadge name={activeTagName.name} color={activeTagName.color} className="mx-1" /></>}
                                {searchQuery && <> contendo &ldquo;{searchQuery}&rdquo;</>}
                            </span>
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(""); setActiveTagFilter(null) }}
                                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Limpar filtros"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}

                    {/* Notes grid */}
                    {isLoadingNotes ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            <span className="text-xs">Carregando notas…</span>
                        </div>
                    ) : filteredNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                            <StickyNote className="h-10 w-10 opacity-20" />
                            <div className="text-center">
                                <p className="text-sm font-medium">
                                    {notes.length === 0 ? "Nenhuma nota ainda" : "Nenhuma nota encontrada"}
                                </p>
                                <p className="text-xs mt-1">
                                    {notes.length === 0
                                        ? "Clique em \"Nova Nota\" para começar."
                                        : "Tente ajustar os filtros de busca."}
                                </p>
                            </div>
                            {notes.length === 0 && (
                                <Button
                                    size="sm"
                                    onClick={() => setView("create")}
                                    className="mt-1 cursor-pointer"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                    Criar primeira nota
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredNotes.map((note) => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onArchiveToggle={handleArchiveToggle}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    )
}
