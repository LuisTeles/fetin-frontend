"use client"

import { useState } from "react"
import Link from "next/link"
import { Pencil, Trash2, Archive, ArchiveRestore, MoreHorizontal, BookOpen, Hash, Maximize2, ExternalLink } from "lucide-react"
import { TagBadge } from "@/components/notes/tag-badge"
import { MarkdownPreview } from "@/components/notes/markdown-preview"
import { type Note } from "@/lib/api/notes"
import { cn } from "@/lib/utils"

interface NoteCardProps {
    note: Note
    onEdit: (note: Note) => void
    onDelete: (id: string) => void
    onArchiveToggle: (note: Note) => void
}

function formatRelativeDate(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(diff / 60_000)
    if (minutes < 1) return "agora mesmo"
    if (minutes < 60) return `há ${minutes} min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `há ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `há ${days} dia${days > 1 ? "s" : ""}`
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

export function NoteCard({ note, onEdit, onDelete, onArchiveToggle }: NoteCardProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const displayTitle =
        note.title ||
        note.content
            .split("\n")
            .find((l) => l.trim())
            ?.replace(/^#+\s*/, "")
            .substring(0, 80) ||
        "Sem título"

    const entityLabel = note.subject?.name
        ?? note.topic?.name
        ?? (note.exam ? `Prova – ${new Date(note.exam.examDate).toLocaleDateString("pt-BR")}` : null)

    const linkedNotesCount =
        (note.outgoingLinks?.length ?? 0) + (note.incomingLinks?.length ?? 0)

    return (
        <article
            className={cn(
                "group relative rounded-lg border border-border/60 bg-card p-3.5 shadow-xs transition-all card-pop-in note-card-hover flex flex-col justify-between cursor-pointer",
                note.isArchived && "opacity-60",
            )}
        >
            {/* Clickable Card Area overlaying the whole card */}
            <Link
                href={`/notes/${note.id}`}
                className="absolute inset-0 z-0 rounded-lg"
                aria-label={`Abrir nota ${displayTitle}`}
            />

            <div>
                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-2 mb-2 relative z-10">
                    <div className="min-w-0 flex-1 pointer-events-none">
                        <h3 className="truncate text-xs font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                            {displayTitle}
                        </h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {entityLabel && (
                                <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                                    <BookOpen className="h-2.5 w-2.5" />
                                    {entityLabel}
                                </span>
                            )}
                            <span className="text-[9px] text-muted-foreground">
                                {formatRelativeDate(note.updatedAt)}
                            </span>
                            {linkedNotesCount > 0 && (
                                <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                                    <Hash className="h-2.5 w-2.5" />
                                    {linkedNotesCount} link{linkedNotesCount > 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── Actions menu & Quick Open ── */}
                    <div className="relative shrink-0 flex items-center gap-1">
                        {/* Explicit Open Button */}
                        <Link
                            href={`/notes/${note.id}`}
                            title="Abrir página completa"
                            className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Link>

                        {/* More Menu */}
                        <button
                            type="button"
                            aria-label="Ações da nota"
                            onClick={(e) => {
                                e.stopPropagation()
                                setMenuOpen((v) => !v)
                                setConfirmDelete(false)
                            }}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>

                        {menuOpen && (
                            <>
                                {/* Backdrop */}
                                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false) }} />
                                <div className="absolute right-0 top-6 z-50 w-40 rounded-md border border-border bg-popover shadow-lg py-1">
                                    {!confirmDelete ? (
                                        <>
                                            <Link
                                                href={`/notes/${note.id}`}
                                                onClick={() => setMenuOpen(false)}
                                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors cursor-pointer"
                                            >
                                                <Maximize2 className="h-3 w-3" /> Abrir nota em página
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(note) }}
                                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors cursor-pointer"
                                            >
                                                <Pencil className="h-3 w-3" /> Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onArchiveToggle(note) }}
                                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors cursor-pointer"
                                            >
                                                {note.isArchived ? (
                                                    <><ArchiveRestore className="h-3 w-3" /> Desarquivar</>
                                                ) : (
                                                    <><Archive className="h-3 w-3" /> Arquivar</>
                                                )}
                                            </button>
                                            <div className="border-t border-border/50 my-1" />
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
                                                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                            >
                                                <Trash2 className="h-3 w-3" /> Excluir
                                            </button>
                                        </>
                                    ) : (
                                        <div className="px-3 py-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                            <p className="text-[10px] text-destructive font-medium">Confirmar exclusão?</p>
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(note.id) }}
                                                    className="flex-1 rounded bg-destructive px-2 py-1 text-[10px] text-white font-medium cursor-pointer hover:bg-destructive/90 transition-colors"
                                                >
                                                    Excluir
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                                                    className="flex-1 rounded border border-border px-2 py-1 text-[10px] cursor-pointer hover:bg-muted transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Markdown preview (truncated) ── */}
                <div className="max-h-24 overflow-hidden relative pointer-events-none">
                    <MarkdownPreview content={note.content} />
                    {/* Fade out gradient for long content */}
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent" />
                </div>
            </div>

            {/* ── Tags & Hover Hint ── */}
            <div className="mt-2.5 flex items-center justify-between gap-1 relative z-10">
                <div className="flex flex-wrap gap-1">
                    {note.tags.slice(0, 5).map((nt) => (
                        <TagBadge key={nt.tagId} name={nt.tag.name} color={nt.tag.color} />
                    ))}
                    {note.tags.length > 5 && (
                        <span className="text-[9px] text-muted-foreground self-center">+{note.tags.length - 5}</span>
                    )}
                </div>

            </div>
        </article>
    )
}
