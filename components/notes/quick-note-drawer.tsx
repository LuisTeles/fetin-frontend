"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, StickyNote, CheckCircle2, Loader2 } from "lucide-react"
import { NoteForm } from "@/components/notes/note-form"
import { type Note, type Tag, apiGetNotes, apiGetTags } from "@/lib/api/notes"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickNoteDrawerProps {
    isOpen: boolean
    onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickNoteDrawer({ isOpen, onClose }: QuickNoteDrawerProps) {
    const [tags, setTags] = useState<Tag[]>([])
    const [notes, setNotes] = useState<Note[]>([])
    const [isLoadingData, setIsLoadingData] = useState(false)
    const [savedNote, setSavedNote] = useState<Note | null>(null)
    const [isExiting, setIsExiting] = useState(false)
    const [formKey, setFormKey] = useState(0)

    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const firstFocusRef = useRef<HTMLButtonElement>(null)

    // Load tags + notes when drawer opens
    useEffect(() => {
        if (!isOpen) return
        setIsLoadingData(true)
        setSavedNote(null)
        Promise.all([apiGetTags(), apiGetNotes()])
            .then(([t, n]) => { setTags(t); setNotes(n) })
            .catch(() => {/* silently degrade */})
            .finally(() => setIsLoadingData(false))
    }, [isOpen])

    // Focus trap: focus close button on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => firstFocusRef.current?.focus(), 50)
        }
    }, [isOpen])

    // Escape key to close
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape" && isOpen) triggerClose()
        }
        document.addEventListener("keydown", handleKey)
        return () => document.removeEventListener("keydown", handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    // Prevent body scroll while open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden"
        } else {
            document.body.style.overflow = ""
        }
        return () => { document.body.style.overflow = "" }
    }, [isOpen])

    const triggerClose = useCallback(() => {
        setIsExiting(true)
        closeTimerRef.current = setTimeout(() => {
            setIsExiting(false)
            setSavedNote(null)
            setFormKey((k) => k + 1) // reset form
            onClose()
        }, 230)
    }, [onClose])

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
        }
    }, [])

    function handleSuccess(note: Note) {
        setSavedNote(note)
        // Auto-close after showing success for 1.5s
        setTimeout(() => triggerClose(), 1500)
    }

    if (!isOpen && !isExiting) return null

    const panelClass = isExiting ? "drawer-exit" : "drawer-enter"
    const backdropClass = isExiting ? "backdrop-exit" : "backdrop-enter"

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className={cn("absolute inset-0 bg-black/30 backdrop-blur-[2px]", backdropClass)}
                onClick={triggerClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Nova nota rápida"
                className={cn(
                    "relative z-10 flex h-full w-full max-w-md flex-col bg-background shadow-2xl",
                    panelClass,
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                        <StickyNote className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Nova Nota Rápida</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground font-mono">
                            Option+N / Alt+N
                        </kbd>
                        <button
                            ref={firstFocusRef}
                            type="button"
                            onClick={triggerClose}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                            aria-label="Fechar"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    {savedNote ? (
                        /* ── Success state ── */
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
                            <div className="rounded-full bg-green-500/15 p-4">
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Nota salva!</p>
                                <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-[200px]">
                                    {savedNote.title ?? savedNote.content.slice(0, 50)}
                                </p>
                            </div>
                            <p className="text-[10px] text-muted-foreground animate-pulse">
                                Fechando…
                            </p>
                        </div>
                    ) : isLoadingData ? (
                        /* ── Loading state ── */
                        <div className="flex items-center justify-center h-40 gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Carregando…
                        </div>
                    ) : (
                        /* ── Form ── */
                        <NoteForm
                            key={formKey}
                            tags={tags}
                            notes={notes}
                            compact
                            onSuccess={handleSuccess}
                            onCancel={triggerClose}
                        />
                    )}
                </div>

                {/* Footer hint */}
                {!savedNote && !isLoadingData && (
                    <div className="border-t border-border px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Pressione <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">Esc</kbd> para fechar</span>
                        <span>Notas são salvas automaticamente</span>
                    </div>
                )}
            </aside>
        </div>
    )
}
