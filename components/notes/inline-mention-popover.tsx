"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { BookOpen, GraduationCap, FileText, StickyNote, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { type MentionResult, type MentionEntityType, apiSearchMentionEntities } from "@/lib/api/entities"
import type { Note } from "@/lib/api/notes"

// ─── Config ───────────────────────────────────────────────────────────────────

const ENTITY_CONFIG: Record<MentionEntityType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    subject: {
        label: "Disciplina",
        icon: <BookOpen className="h-3 w-3" />,
        color: "text-blue-500",
        bg: "bg-blue-500/10 border-blue-500/20",
    },
    topic: {
        label: "Tópico",
        icon: <GraduationCap className="h-3 w-3" />,
        color: "text-green-500",
        bg: "bg-green-500/10 border-green-500/20",
    },
    exam: {
        label: "Prova",
        icon: <FileText className="h-3 w-3" />,
        color: "text-orange-500",
        bg: "bg-orange-500/10 border-orange-500/20",
    },
    note: {
        label: "Nota",
        icon: <StickyNote className="h-3 w-3" />,
        color: "text-purple-500",
        bg: "bg-purple-500/10 border-purple-500/20",
    },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MentionState {
    active: boolean
    query: string
    startIndex: number // position of '@' in textarea value
}

interface InlineMentionPopoverProps {
    textareaId: string
    value: string
    onChange: (value: string) => void
    /** Pass existing notes so they appear in the mention list */
    notes?: Note[]
    disabled?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Detects if the current cursor is inside an active @mention.
 * Returns { active: false } when cursor is not in a mention context.
 */
function detectMentionContext(
    text: string,
    cursorPos: number,
): MentionState {
    // Walk backward from cursor to find '@'
    const slice = text.slice(0, cursorPos)
    const atIndex = slice.lastIndexOf("@")

    if (atIndex === -1) return { active: false, query: "", startIndex: -1 }

    // Ensure no whitespace between '@' and cursor (mentions can't span lines)
    const between = slice.slice(atIndex + 1)
    if (/[\s\n]/.test(between)) return { active: false, query: "", startIndex: -1 }

    return {
        active: true,
        query: between,
        startIndex: atIndex,
    }
}

/**
 * Inserts mention text at the @mention position, replacing the partial query.
 */
function insertMention(
    text: string,
    mentionState: MentionState,
    result: MentionResult,
    cursorPos: number,
): { newText: string; newCursor: number } {
    const mention = `@${result.type}:${result.id}[${result.label}]`
    const before = text.slice(0, mentionState.startIndex)
    const after = text.slice(cursorPos)
    const newText = before + mention + " " + after
    const newCursor = mentionState.startIndex + mention.length + 1
    return { newText, newCursor }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InlineMentionPopover({
    textareaId,
    value,
    onChange,
    notes = [],
    disabled = false,
}: InlineMentionPopoverProps) {
    const [mention, setMention] = useState<MentionState>({ active: false, query: "", startIndex: -1 })
    const [results, setResults] = useState<MentionResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 })

    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const popoverRef = useRef<HTMLDivElement>(null)

    // ── Compute popover position relative to the textarea ────────────────────
    const updatePopoverPosition = useCallback(() => {
        const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null
        if (!textarea) return

        const rect = textarea.getBoundingClientRect()
        const scrollParent = textarea.offsetParent as HTMLElement | null
        const scrollTop = scrollParent?.scrollTop ?? 0

        // Rough estimate: position below the current line
        const lineHeight = 18 // px, matches text-xs leading-relaxed
        const paddingTop = 10

        // Count newlines before cursor for vertical offset
        const cursorPos = textarea.selectionStart ?? 0
        const textBeforeCursor = value.slice(0, cursorPos)
        const lineCount = (textBeforeCursor.match(/\n/g) ?? []).length

        const relativeTop = rect.top + paddingTop + (lineCount + 1) * lineHeight - scrollTop
        const relativeLeft = rect.left

        setPopoverPos({ top: relativeTop, left: relativeLeft })
    }, [textareaId, value])

    // ── Search entities when query changes ───────────────────────────────────
    useEffect(() => {
        if (!mention.active) {
            setResults([])
            setActiveIndex(0)
            return
        }

        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

        setIsLoading(true)
        searchTimerRef.current = setTimeout(async () => {
            try {
                const found = await apiSearchMentionEntities(
                    mention.query,
                    notes.map((n) => ({ id: n.id, title: n.title, content: n.content })),
                )
                setResults(found)
                setActiveIndex(0)
            } catch {
                setResults([])
            } finally {
                setIsLoading(false)
            }
        }, 200)

        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
        }
    }, [mention.active, mention.query, notes])

    // ── Handle textarea events ────────────────────────────────────────────────
    useEffect(() => {
        const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null
        if (!textarea || disabled) return

        function handleInput() {
            const cursor = textarea!.selectionStart ?? 0
            const state = detectMentionContext(value, cursor)
            setMention(state)
            if (state.active) updatePopoverPosition()
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (!mention.active || results.length === 0) return

            if (e.key === "ArrowDown") {
                e.preventDefault()
                setActiveIndex((i) => Math.min(i + 1, results.length - 1))
            } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setActiveIndex((i) => Math.max(i - 1, 0))
            } else if (e.key === "Enter" || e.key === "Tab") {
                if (mention.active && results[activeIndex]) {
                    e.preventDefault()
                    handleSelect(results[activeIndex])
                }
            } else if (e.key === "Escape") {
                setMention({ active: false, query: "", startIndex: -1 })
            }
        }

        textarea.addEventListener("input", handleInput)
        textarea.addEventListener("keydown", handleKeyDown)
        textarea.addEventListener("click", handleInput)

        return () => {
            textarea.removeEventListener("input", handleInput)
            textarea.removeEventListener("keydown", handleKeyDown)
            textarea.removeEventListener("click", handleInput)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textareaId, value, mention, results, activeIndex, disabled, updatePopoverPosition])

    // ── Select a mention result ───────────────────────────────────────────────
    function handleSelect(result: MentionResult) {
        const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null
        const cursorPos = textarea?.selectionStart ?? 0
        const { newText, newCursor } = insertMention(value, mention, result, cursorPos)

        onChange(newText)
        setMention({ active: false, query: "", startIndex: -1 })
        setResults([])

        requestAnimationFrame(() => {
            textarea?.focus()
            textarea?.setSelectionRange(newCursor, newCursor)
        })
    }

    if (!mention.active) return null

    // Group results by type
    const grouped = (["subject", "topic", "exam", "note"] as MentionEntityType[]).reduce(
        (acc, type) => {
            const items = results.filter((r) => r.type === type)
            if (items.length > 0) acc[type] = items
            return acc
        },
        {} as Partial<Record<MentionEntityType, MentionResult[]>>,
    )

    let flatIndex = 0

    return (
        <div
            ref={popoverRef}
            style={{ position: "fixed", top: popoverPos.top, left: popoverPos.left, zIndex: 9999 }}
            className="w-72 rounded-lg border border-border bg-popover shadow-xl"
            onMouseDown={(e) => e.preventDefault()} // prevent textarea blur
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Mencionar
                </span>
                {mention.query && (
                    <span className="text-[10px] text-muted-foreground">
                        &ldquo;{mention.query}&rdquo;
                    </span>
                )}
            </div>

            {/* Results */}
            <div className="max-h-56 overflow-y-auto py-1">
                {isLoading ? (
                    <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Buscando…
                    </div>
                ) : results.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                        {mention.query ? "Nenhum resultado" : "Digite para buscar…"}
                    </p>
                ) : (
                    Object.entries(grouped).map(([type, items]) => {
                        const config = ENTITY_CONFIG[type as MentionEntityType]
                        return (
                            <div key={type}>
                                {/* Group header */}
                                <div className={cn("flex items-center gap-1.5 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider", config.color)}>
                                    {config.icon}
                                    {config.label}s
                                </div>
                                {items.map((item) => {
                                    const currentIndex = flatIndex++
                                    const isActive = currentIndex === activeIndex
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onMouseEnter={() => setActiveIndex(currentIndex)}
                                            onClick={() => handleSelect(item)}
                                            className={cn(
                                                "flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors cursor-pointer",
                                                isActive ? "bg-muted" : "hover:bg-muted/60",
                                            )}
                                        >
                                            <span className={cn("shrink-0", config.color)}>{config.icon}</span>
                                            <span className="flex-1 truncate">{item.label}</span>
                                            {item.sublabel && (
                                                <span className="text-[10px] text-muted-foreground shrink-0">
                                                    {item.sublabel}
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Footer hint */}
            <div className="border-t border-border px-3 py-1.5 flex items-center gap-3 text-[9px] text-muted-foreground">
                <span>↑↓ navegar</span>
                <span>↵ selecionar</span>
                <span>Esc fechar</span>
            </div>
        </div>
    )
}
