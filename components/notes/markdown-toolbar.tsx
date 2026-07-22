"use client"

import { Bold, Italic, Code, List, ListOrdered, Quote, Heading2, Minus, AtSign } from "lucide-react"
import { cn } from "@/lib/utils"

type ToolbarAction = {
    label: string
    icon: React.ReactNode
    prefix: string
    suffix?: string
    block?: boolean // insert on its own line
}

const ACTIONS: ToolbarAction[] = [
    { label: "Negrito", icon: <Bold className="h-3.5 w-3.5" />, prefix: "**", suffix: "**" },
    { label: "Itálico", icon: <Italic className="h-3.5 w-3.5" />, prefix: "_", suffix: "_" },
    { label: "Código inline", icon: <Code className="h-3.5 w-3.5" />, prefix: "`", suffix: "`" },
    { label: "Título", icon: <Heading2 className="h-3.5 w-3.5" />, prefix: "## ", block: true },
    { label: "Lista", icon: <List className="h-3.5 w-3.5" />, prefix: "- ", block: true },
    { label: "Lista numerada", icon: <ListOrdered className="h-3.5 w-3.5" />, prefix: "1. ", block: true },
    { label: "Citação", icon: <Quote className="h-3.5 w-3.5" />, prefix: "> ", block: true },
    { label: "Divisor", icon: <Minus className="h-3.5 w-3.5" />, prefix: "\n---\n", block: true },
]

interface MarkdownToolbarProps {
    textareaId: string
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    /** Called when the @ mention button is clicked */
    onMentionTrigger?: () => void
}

export function MarkdownToolbar({ textareaId, value, onChange, disabled, onMentionTrigger }: MarkdownToolbarProps) {
    function applyAction(action: ToolbarAction) {
        const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selected = value.slice(start, end)
        const prefix = action.prefix
        const suffix = action.suffix ?? ""

        let newValue: string
        let newCursorStart: number
        let newCursorEnd: number

        if (action.block && !suffix) {
            // For block prefixes (headings, lists, quotes), prefix the line
            const before = value.slice(0, start)
            const after = value.slice(end)
            const lineContent = selected || "texto"
            newValue = before + prefix + lineContent + after
            newCursorStart = start + prefix.length
            newCursorEnd = newCursorStart + lineContent.length
        } else {
            // Inline wrap (bold, italic, code)
            const before = value.slice(0, start)
            const after = value.slice(end)
            const inner = selected || "texto"
            newValue = before + prefix + inner + suffix + after
            newCursorStart = start + prefix.length
            newCursorEnd = newCursorStart + inner.length
        }

        onChange(newValue)

        // Restore focus + selection after React re-render
        requestAnimationFrame(() => {
            textarea.focus()
            textarea.setSelectionRange(newCursorStart, newCursorEnd)
        })
    }

    function handleMentionClick() {
        const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null
        if (!textarea) return

        const start = textarea.selectionStart
        const newValue = value.slice(0, start) + "@" + value.slice(start)
        onChange(newValue)

        requestAnimationFrame(() => {
            textarea.focus()
            textarea.setSelectionRange(start + 1, start + 1)
            // Fire a synthetic input event so the popover detects the @
            textarea.dispatchEvent(new Event("input", { bubbles: true }))
        })

        onMentionTrigger?.()
    }

    return (
        <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 border-input bg-muted/40 px-2 py-1.5">
            {ACTIONS.map((action) => (
                <button
                    key={action.label}
                    type="button"
                    title={action.label}
                    aria-label={action.label}
                    disabled={disabled}
                    onClick={() => applyAction(action)}
                    className={cn(
                        "rounded p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer",
                        disabled && "cursor-not-allowed opacity-40",
                    )}
                >
                    {action.icon}
                </button>
            ))}

            {/* Divider */}
            <span className="mx-1 h-4 w-px bg-border/60" />

            {/* @ Mention button */}
            <button
                type="button"
                title="Mencionar entidade (@)"
                aria-label="Inserir menção"
                disabled={disabled}
                onClick={handleMentionClick}
                className={cn(
                    "flex items-center gap-0.5 rounded px-1.5 py-1 text-[10px] font-semibold text-muted-foreground transition-colors",
                    "hover:bg-background hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer",
                    disabled && "cursor-not-allowed opacity-40",
                )}
            >
                <AtSign className="h-3.5 w-3.5" />
            </button>

            <span className="ml-auto text-[9px] text-muted-foreground/60 hidden sm:block pr-1">Markdown</span>
        </div>
    )
}
