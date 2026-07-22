"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Eye, Pencil, Loader2, BookOpen, Tag as TagIcon, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MarkdownToolbar } from "@/components/notes/markdown-toolbar"
import { MarkdownPreview } from "@/components/notes/markdown-preview"
import { TagSelectorDropdown } from "@/components/notes/tag-selector-dropdown"
import { EntitySelectorDropdown, type EntityType, type SelectedEntity } from "@/components/notes/entity-selector-dropdown"
import { InlineMentionPopover } from "@/components/notes/inline-mention-popover"
import {
    type Note,
    type Tag,
    type CreateNotePayload,
    type UpdateNotePayload,
    apiCreateNote,
    apiUpdateNote,
} from "@/lib/api/notes"
import { cn } from "@/lib/utils"

const TEXTAREA_ID = "note-content-editor"
const MAX_CHARS = 5000
const AUTOSAVE_DELAY = 500 // ms

interface NoteFormProps {
    /** If provided, the form operates in edit mode */
    note?: Note
    /** Available tags to pick from */
    tags: Tag[]
    /** All notes (for @ mention search) */
    notes?: Note[]
    /** Called after successful create or update */
    onSuccess: (note: Note) => void
    /** Called on cancel */
    onCancel?: () => void
    /** Compact single-column layout (for drawer) vs full layout */
    compact?: boolean
}

export function NoteForm({ note, tags, notes = [], onSuccess, onCancel, compact = false }: NoteFormProps) {
    const isEdit = !!note

    // ── Core fields ──────────────────────────────────────────────────────────
    const [title, setTitle] = useState(note?.title ?? "")
    const [content, setContent] = useState(note?.content ?? "")
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
        note?.tags.map((nt) => nt.tagId) ?? [],
    )

    // ── Entity linking ────────────────────────────────────────────────────────
    const initialEntityType: EntityType = note?.subjectId
        ? "subject"
        : note?.topicId
          ? "topic"
          : note?.examId
            ? "exam"
            : "none"

    const initialLabel =
        note?.subject?.name ??
        note?.topic?.name ??
        (note?.exam ? new Date(note.exam.examDate).toLocaleDateString("pt-BR") : "")

    const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>({
        type: initialEntityType,
        id: note?.subjectId ?? note?.topicId ?? note?.examId ?? "",
        label: initialLabel,
    })

    // ── UI state ─────────────────────────────────────────────────────────────
    const [mode, setMode] = useState<"edit" | "preview">("edit")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [charCount, setCharCount] = useState(note?.content.length ?? 0)

    // ── Debounced auto-save (edit mode only) ──────────────────────────────────
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isMounted = useRef(true)

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
        }
    }, [])

    // ── Content handler ───────────────────────────────────────────────────────
    function handleContentChange(val: string) {
        if (val.length > MAX_CHARS) return
        setContent(val)
        setCharCount(val.length)
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = useCallback(
        async (e?: React.FormEvent) => {
            e?.preventDefault()
            if (!content.trim()) {
                setError("O conteúdo da nota é obrigatório.")
                return
            }

            setIsLoading(true)
            setError(null)

            try {
                const entityPayload: Pick<CreateNotePayload, "subjectId" | "topicId" | "examId"> = {
                    subjectId: selectedEntity.type === "subject" ? selectedEntity.id || undefined : undefined,
                    topicId: selectedEntity.type === "topic" ? selectedEntity.id || undefined : undefined,
                    examId: selectedEntity.type === "exam" ? selectedEntity.id || undefined : undefined,
                }

                let savedNote: Note

                if (isEdit) {
                    const payload: UpdateNotePayload = {
                        title: title.trim() || undefined,
                        content,
                        tagIds: selectedTagIds,
                        subjectId: selectedEntity.type === "subject" ? (selectedEntity.id || null) : null,
                        topicId: selectedEntity.type === "topic" ? (selectedEntity.id || null) : null,
                        examId: selectedEntity.type === "exam" ? (selectedEntity.id || null) : null,
                    }
                    savedNote = await apiUpdateNote(note!.id, payload)
                } else {
                    const payload: CreateNotePayload = {
                        title: title.trim() || undefined,
                        content,
                        tagIds: selectedTagIds,
                        ...entityPayload,
                    }
                    savedNote = await apiCreateNote(payload)
                }

                if (isMounted.current) onSuccess(savedNote)
            } catch (err: unknown) {
                if (isMounted.current) {
                    setError(err instanceof Error ? err.message : "Erro ao salvar nota.")
                }
            } finally {
                if (isMounted.current) setIsLoading(false)
            }
        },
        [content, title, selectedTagIds, selectedEntity, isEdit, note, onSuccess],
    )

    const charPercent = Math.round((charCount / MAX_CHARS) * 100)
    const charColor =
        charPercent > 90 ? "text-destructive" : charPercent > 70 ? "text-amber-500" : "text-muted-foreground"

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
                <Alert variant="destructive">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
            )}

            {/* ── Title (optional) ── */}
            <div className="space-y-1">
                <Input
                    id="note-title"
                    placeholder="Título (opcional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={150}
                    disabled={isLoading}
                    className="border-0 border-b rounded-none px-0 text-sm font-medium shadow-none focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/50"
                />
            </div>

            {/* ── Markdown Editor + Toolbar ── */}
            <div className="space-y-0">
                <div className="flex items-center justify-between px-0 pb-1">
                    <Label className="text-xs text-muted-foreground">Conteúdo</Label>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setMode("edit")}
                            className={cn(
                                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer",
                                mode === "edit"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <Pencil className="inline h-2.5 w-2.5 mr-0.5" />
                            Editar
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("preview")}
                            className={cn(
                                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer",
                                mode === "preview"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <Eye className="inline h-2.5 w-2.5 mr-0.5" />
                            Preview
                        </button>
                    </div>
                </div>

                {mode === "edit" ? (
                    <div className="relative rounded-md border border-input overflow-hidden focus-within:ring-1 focus-within:ring-ring">
                        <MarkdownToolbar
                            textareaId={TEXTAREA_ID}
                            value={content}
                            onChange={handleContentChange}
                            disabled={isLoading}
                        />
                        <textarea
                            id={TEXTAREA_ID}
                            value={content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            disabled={isLoading}
                            placeholder={"**Nota rápida:** comece a escrever em Markdown…\n\n- Use * para listas\n- Use **negrito** ou _itálico_\n- Use @ para mencionar disciplinas, tópicos e provas"}
                            rows={compact ? 8 : 12}
                            className="w-full resize-none bg-background px-3 py-2.5 text-xs leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none font-mono disabled:opacity-50"
                        />
                        <InlineMentionPopover
                            textareaId={TEXTAREA_ID}
                            value={content}
                            onChange={handleContentChange}
                            notes={notes}
                            disabled={isLoading}
                        />
                    </div>
                ) : (
                    <div className="min-h-[12rem] rounded-md border border-input bg-muted/20 px-3 py-2.5">
                        <MarkdownPreview content={content} />
                    </div>
                )}

                {/* Char counter */}
                <p className={cn("mt-1 text-right text-[10px]", charColor)}>
                    {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </p>
            </div>

            {/* ── Tags ── */}
            <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TagIcon className="h-3 w-3" />
                    Tags
                </Label>
                <TagSelectorDropdown
                    tags={tags}
                    selectedIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                    disabled={isLoading}
                />
            </div>

            {/* ── Entity linking ── */}
            <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Link2 className="h-3 w-3" />
                    Vincular a
                </Label>
                <EntitySelectorDropdown
                    value={selectedEntity}
                    onChange={setSelectedEntity}
                    disabled={isLoading}
                />
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                {onCancel && (
                    <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isLoading} className="cursor-pointer">
                        Cancelar
                    </Button>
                )}
                <Button type="submit" size="sm" disabled={isLoading || !content.trim()} className="cursor-pointer">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Salvando…
                        </>
                    ) : isEdit ? (
                        "Salvar Alterações"
                    ) : (
                        <>
                            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                            Criar Nota
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
