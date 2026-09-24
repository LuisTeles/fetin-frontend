"use client"

import { formatExamLabel } from "@/lib/api/entities"
import { formatDateTime } from "@/lib/format"
import { DetailSkeleton } from "@/components/skeletons/detail-skeleton"
import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft,
    Pencil,
    Archive,
    ArchiveRestore,
    Trash2,
    BookOpen,
    GraduationCap,
    FileText,
    Calendar,
    Hash,
    Loader2,
    Share2,
    Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TagBadge } from "@/components/notes/tag-badge"
import { MarkdownPreview } from "@/components/notes/markdown-preview"
import { NoteForm } from "@/components/notes/note-form"
import {
    type Note,
    type Tag,
    apiGetNote,
    apiGetTags,
    apiGetNotes,
    apiUpdateNote,
    apiDeleteNote,
} from "@/lib/api/notes"
import { cn } from "@/lib/utils"

export default function SingleNotePage() {
    const params = useParams()
    const router = useRouter()
    const noteId = params?.id as string

    const [note, setNote] = useState<Note | null>(null)
    const [tags, setTags] = useState<Tag[]>([])
    const [allNotes, setAllNotes] = useState<Note[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isActionLoading, setIsActionLoading] = useState(false)

    // ── Load single note data ──────────────────────────────────────────────────
    const loadNoteData = useCallback(async () => {
        if (!noteId) return
        setIsLoading(true)
        setError(null)
        try {
            const [fetchedNote, fetchedTags, fetchedNotes] = await Promise.all([
                apiGetNote(noteId),
                apiGetTags().catch(() => []),
                apiGetNotes({ includeArchived: true }).catch(() => []),
            ])
            setNote(fetchedNote)
            setTags(fetchedTags)
            setAllNotes(fetchedNotes)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Nota não encontrada.")
        } finally {
            setIsLoading(false)
        }
    }, [noteId])

    useEffect(() => {
        loadNoteData()
    }, [loadNoteData])

    // ── Actions ───────────────────────────────────────────────────────────────
    async function handleToggleArchive() {
        if (!note) return
        setIsActionLoading(true)
        try {
            const updated = await apiUpdateNote(note.id, { isArchived: !note.isArchived })
            setNote(updated)
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Erro ao alterar estado de arquivamento.")
        } finally {
            setIsActionLoading(false)
        }
    }

    async function handleDelete() {
        if (!note) return
        setIsActionLoading(true)
        try {
            await apiDeleteNote(note.id)
            router.push("/notes")
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Erro ao excluir nota.")
            setIsActionLoading(false)
        }
    }

    function handleEditSuccess(updated: Note) {
        setNote(updated)
        setIsEditing(false)
    }

    if (isLoading) {
        return (
            <DetailSkeleton label="Carregando nota" />
        )
    }

    if (error || !note) {
        return (
            <div className="space-y-4 py-8 max-w-2xl mx-auto text-center">
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
                    <p className="text-sm font-semibold text-destructive mb-2">
                        {error ?? "Nota não encontrada."}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                        A nota que você está procurando pode ter sido excluída ou você não tem permissão para acessá-la.
                    </p>
                    <Link href="/notes" className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Notas
                    </Link>
                </div>
            </div>
        )
    }

    const displayTitle =
        note.title ||
        note.content
            .split("\n")
            .find((l) => l.trim())
            ?.replace(/^#+\s*/, "")
            .substring(0, 100) ||
        "Sem título"

    const entityLabel = note.subject?.name
        ?? note.topic?.name
        ?? (note.exam ? formatExamLabel(note.exam) : null)

    const entityIcon = note.subject ? (
        <BookOpen className="h-3.5 w-3.5 text-blue-500" />
    ) : note.topic ? (
        <GraduationCap className="h-3.5 w-3.5 text-green-500" />
    ) : note.exam ? (
        <FileText className="h-3.5 w-3.5 text-orange-500" />
    ) : null

    // Combined linked notes
    const allLinks = [
        ...(note.outgoingLinks ?? []).map((l) => l.targetNote).filter(Boolean),
        ...(note.incomingLinks ?? []).map((l) => l.sourceNote).filter(Boolean),
    ]

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
            {/* ── Navigation Top Bar ── */}
            <div className="flex items-center justify-between border-b border-border pb-3">
                <Link href="/notes" className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Voltar para Notas
                </Link>

                <div className="flex items-center gap-2">
                    <Button
                        variant={isEditing ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsEditing((prev) => !prev)}
                        className="text-xs h-8 cursor-pointer"
                    >
                        {isEditing ? (
                            <>
                                <Eye className="mr-1.5 h-3.5 w-3.5" /> Visualizar
                            </>
                        ) : (
                            <>
                                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isActionLoading}
                        onClick={handleToggleArchive}
                        className="text-xs h-8 cursor-pointer"
                    >
                        {note.isArchived ? (
                            <>
                                <ArchiveRestore className="mr-1.5 h-3.5 w-3.5 text-warning" /> Desarquivar
                            </>
                        ) : (
                            <>
                                <Archive className="mr-1.5 h-3.5 w-3.5" /> Arquivar
                            </>
                        )}
                    </Button>

                    {!isDeleting ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsDeleting(true)}
                            className="text-xs h-8 text-muted-foreground hover:bg-danger/10 hover:text-danger cursor-pointer"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    ) : (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="destructive"
                                size="sm"
                                disabled={isActionLoading}
                                onClick={handleDelete}
                                className="text-xs h-8 cursor-pointer"
                            >
                                Confirmar Exclusão
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsDeleting(false)}
                                className="text-xs h-8 cursor-pointer"
                            >
                                Cancelar
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Mode Switch: Edit vs Read ── */}
            {isEditing ? (
                <Card className="p-6">
                    <div className="mb-4 pb-2 border-b border-border">
                        <h2 className="text-base font-semibold">Editar Nota</h2>
                        <p className="text-xs text-muted-foreground">Altere o título, conteúdo, tags ou vinculação da nota.</p>
                    </div>
                    <NoteForm
                        note={note}
                        tags={tags}
                        notes={allNotes}
                        onSuccess={handleEditSuccess}
                        onCancel={() => setIsEditing(false)}
                    />
                </Card>
            ) : (
                /* ── Full Reading View ── */
                <article className="space-y-6">
                    {/* Header Details */}
                    <div className="space-y-3">
                        {/* Status badges */}
                        <div className="flex flex-wrap items-center gap-2">
                            {note.isArchived && (
                                <span className="rounded-full bg-warning/15 text-warning border border-warning/30 px-2.5 py-0.5 text-[10px] font-medium">
                                    Arquivada
                                </span>
                            )}
                            {entityLabel && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-medium text-foreground">
                                    {entityIcon}
                                    {entityLabel}
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="page-title">
                            {displayTitle}
                        </h1>

                        {/* Metadata bar */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1 border-b border-border/40 pb-3">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Criada em {formatDateTime(note.createdAt)}
                            </span>
                            {note.updatedAt !== note.createdAt && (
                                <span className="flex items-center gap-1.5">
                                    Atualizada {formatDateTime(note.updatedAt)}
                                </span>
                            )}
                        </div>

                        {/* Tags list */}
                        {note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {note.tags.map((nt) => (
                                    <TagBadge key={nt.tagId} name={nt.tag.name} color={nt.tag.color} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Markdown Content (Full view) */}
                    <Card className="p-6 md:p-8 bg-card border-border/80">
                        <MarkdownPreview content={note.content} className="prose-base" />
                    </Card>

                    {/* ── Linked Notes / Mentions Section ── */}
                    {allLinks.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-border">
                            <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                <Hash className="h-3.5 w-3.5 text-primary" />
                                Notas Relacionadas ({allLinks.length})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {allLinks.map((linkedNote) => {
                                    if (!linkedNote) return null
                                    const linkedTitle =
                                        linkedNote.title ||
                                        linkedNote.content?.slice(0, 40) ||
                                        "Nota sem título"
                                    return (
                                        <Link
                                            key={linkedNote.id}
                                            href={`/notes/${linkedNote.id}`}
                                            className="group flex flex-col justify-between rounded-lg border border-border/70 bg-card p-3 transition-all hover:border-primary hover:shadow-xs"
                                        >
                                            <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                                {linkedTitle}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">
                                                {linkedNote.content}
                                            </p>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </article>
            )}
        </div>
    )
}
