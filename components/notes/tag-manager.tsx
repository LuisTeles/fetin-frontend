"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Check, X, Loader2, Tag as TagIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TagBadge } from "@/components/notes/tag-badge"
import { ColorPalettePicker, TAG_COLOR_PRESETS } from "@/components/notes/color-palette-picker"
import { type Tag, apiGetTags, apiCreateTag, apiUpdateTag, apiDeleteTag } from "@/lib/api/notes"

export function TagManager() {
    const [tags, setTags] = useState<Tag[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Create form state
    const [newName, setNewName] = useState("")
    const [newColor, setNewColor] = useState(TAG_COLOR_PRESETS[0].hex)
    const [isCreating, setIsCreating] = useState(false)

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editColor, setEditColor] = useState("")
    const [isSavingEdit, setIsSavingEdit] = useState(false)

    // Delete confirmation
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const loadTags = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            const data = await apiGetTags()
            setTags(data)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao carregar tags.")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadTags()
    }, [loadTags])

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        if (!newName.trim()) return

        setIsCreating(true)
        setError(null)
        try {
            const created = await apiCreateTag({ name: newName.trim(), color: newColor })
            setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
            setNewName("")
            setNewColor(TAG_COLOR_PRESETS[0].hex)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao criar tag.")
        } finally {
            setIsCreating(false)
        }
    }

    function startEdit(tag: Tag) {
        setEditingId(tag.id)
        setEditName(tag.name)
        setEditColor(tag.color)
    }

    function cancelEdit() {
        setEditingId(null)
    }

    async function handleSaveEdit(id: string) {
        if (!editName.trim()) return
        setIsSavingEdit(true)
        setError(null)
        try {
            const updated = await apiUpdateTag(id, { name: editName.trim(), color: editColor })
            setTags((prev) =>
                prev.map((t) => (t.id === updated.id ? updated : t)).sort((a, b) => a.name.localeCompare(b.name)),
            )
            setEditingId(null)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao atualizar tag.")
        } finally {
            setIsSavingEdit(false)
        }
    }

    async function handleDelete(id: string) {
        setIsDeleting(true)
        setError(null)
        try {
            await apiDeleteTag(id)
            setTags((prev) => prev.filter((t) => t.id !== id))
            setDeletingId(null)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao excluir tag.")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* ─── Create form ──────────────────────────────────────────── */}
            <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nova Tag
                </p>
                <form onSubmit={handleCreate} className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            id="new-tag-name"
                            placeholder="Ex: Fórmulas, Conceitos…"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            maxLength={50}
                            disabled={isCreating}
                            className="text-sm flex-1"
                        />
                        <Button type="submit" size="sm" disabled={isCreating || !newName.trim()} className="shrink-0 cursor-pointer">
                            {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                            <span className="ml-1 hidden sm:inline">Criar</span>
                        </Button>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Cor</Label>
                        <ColorPalettePicker value={newColor} onChange={setNewColor} disabled={isCreating} />
                    </div>

                    {/* Preview */}
                    {newName.trim() && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">Pré-visualização:</span>
                            <TagBadge name={newName} color={newColor} size="md" />
                        </div>
                    )}
                </form>
            </div>

            {/* ─── Tags list ──────────────────────────────────────────────── */}
            <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Suas Tags ({tags.length})
                </p>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-xs">Carregando tags…</span>
                    </div>
                ) : tags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                        <TagIcon className="h-8 w-8 opacity-30" />
                        <p className="text-xs">Nenhuma tag criada ainda.</p>
                    </div>
                ) : (
                    <ul className="space-y-1.5">
                        {tags.map((tag) => (
                            <li
                                key={tag.id}
                                className="rounded-md border border-border/50 bg-card px-3 py-2.5"
                            >
                                {editingId === tag.id ? (
                                    /* ── Edit mode ── */
                                    <div className="space-y-2.5">
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            maxLength={50}
                                            disabled={isSavingEdit}
                                            className="text-sm h-8"
                                            autoFocus
                                        />
                                        <ColorPalettePicker
                                            value={editColor}
                                            onChange={setEditColor}
                                            disabled={isSavingEdit}
                                        />
                                        <div className="flex items-center gap-1.5 pt-1">
                                            <Button
                                                size="sm"
                                                onClick={() => handleSaveEdit(tag.id)}
                                                disabled={isSavingEdit || !editName.trim()}
                                                className="h-7 text-xs cursor-pointer"
                                            >
                                                {isSavingEdit ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Check className="h-3 w-3" />
                                                )}
                                                <span className="ml-1">Salvar</span>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={cancelEdit}
                                                disabled={isSavingEdit}
                                                className="h-7 text-xs cursor-pointer"
                                            >
                                                <X className="h-3 w-3" />
                                                <span className="ml-1">Cancelar</span>
                                            </Button>
                                        </div>
                                    </div>
                                ) : deletingId === tag.id ? (
                                    /* ── Delete confirmation ── */
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs text-destructive font-medium">
                                            Excluir &ldquo;{tag.name}&rdquo;? Essa ação não pode ser desfeita.
                                        </p>
                                        <div className="flex gap-1 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDelete(tag.id)}
                                                disabled={isDeleting}
                                                className="h-7 text-xs cursor-pointer"
                                            >
                                                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Excluir"}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setDeletingId(null)}
                                                disabled={isDeleting}
                                                className="h-7 text-xs cursor-pointer"
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── Default row ── */
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <TagBadge name={tag.name} color={tag.color} />
                                            {tag._count !== undefined && (
                                                <span className="text-[10px] text-muted-foreground shrink-0">
                                                    {tag._count.notes} {tag._count.notes === 1 ? "nota" : "notas"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => startEdit(tag)}
                                                aria-label={`Editar tag ${tag.name}`}
                                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeletingId(tag.id)}
                                                aria-label={`Excluir tag ${tag.name}`}
                                                className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
