"use client"

import { useState } from "react"
import { Eye, Pencil } from "lucide-react"
import { Label } from "@/components/ui/label"
import { MarkdownToolbar } from "@/components/notes/markdown-toolbar"
import { MarkdownPreview } from "@/components/notes/markdown-preview"
import { InlineMentionPopover } from "@/components/notes/inline-mention-popover"
import { cn } from "@/lib/utils"

const MAX_CHARS = 5000

interface MarkdownFieldProps {
    id: string
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    rows?: number
}

/** One Markdown input with the note editor's toolbar, @mention popover and preview toggle. */
export function MarkdownField({ id, label, value, onChange, placeholder, disabled, rows = 5 }: MarkdownFieldProps) {
    const [mode, setMode] = useState<"edit" | "preview">("edit")
    const set = (v: string) => { if (v.length <= MAX_CHARS) onChange(v) }

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
                <div className="flex items-center gap-1">
                    {(["edit", "preview"] as const).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m)}
                            className={cn(
                                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer",
                                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {m === "edit" ? <Pencil className="inline h-2.5 w-2.5 mr-0.5" /> : <Eye className="inline h-2.5 w-2.5 mr-0.5" />}
                            {m === "edit" ? "Editar" : "Preview"}
                        </button>
                    ))}
                </div>
            </div>
            {mode === "edit" ? (
                <div className="relative rounded-md border border-input overflow-hidden focus-within:ring-1 focus-within:ring-ring">
                    <MarkdownToolbar textareaId={id} value={value} onChange={set} disabled={disabled} />
                    <textarea
                        id={id}
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        disabled={disabled}
                        placeholder={placeholder}
                        rows={rows}
                        className="w-full resize-none bg-background px-3 py-2.5 text-xs leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none font-mono disabled:opacity-50"
                    />
                    <InlineMentionPopover textareaId={id} value={value} onChange={set} disabled={disabled} />
                </div>
            ) : (
                <div className="min-h-[6rem] rounded-md border border-input bg-muted/20 px-3 py-2.5">
                    <MarkdownPreview content={value} />
                </div>
            )}
        </div>
    )
}
