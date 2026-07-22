"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Plus } from "lucide-react"
import { TagBadge } from "@/components/notes/tag-badge"
import { type Tag } from "@/lib/api/notes"
import { cn } from "@/lib/utils"

interface TagSelectorDropdownProps {
    tags: Tag[]
    selectedIds: string[]
    onChange: (ids: string[]) => void
    disabled?: boolean
    placeholder?: string
}

export function TagSelectorDropdown({
    tags,
    selectedIds,
    onChange,
    disabled,
    placeholder = "Adicionar tags…",
}: TagSelectorDropdownProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedTags = tags.filter((t) => selectedIds.includes(t.id))
    const filtered = tags.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()),
    )

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    function toggle(id: string) {
        onChange(
            selectedIds.includes(id)
                ? selectedIds.filter((s) => s !== id)
                : [...selectedIds, id],
        )
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="listbox"
                className={cn(
                    "flex min-h-[2rem] w-full flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-muted-foreground shadow-xs transition-all hover:border-ring focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer",
                    disabled && "cursor-not-allowed opacity-50",
                )}
            >
                {selectedTags.length > 0 ? (
                    selectedTags.map((t) => (
                        <TagBadge
                            key={t.id}
                            name={t.name}
                            color={t.color}
                            onRemove={disabled ? undefined : (e?: React.MouseEvent) => { e?.stopPropagation(); toggle(t.id) }}
                        />
                    ))
                ) : (
                    <span className="flex items-center gap-1">
                        <Plus className="h-3 w-3" />
                        {placeholder}
                    </span>
                )}
                <ChevronDown
                    className={cn(
                        "ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                        open && "rotate-180",
                    )}
                />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                    <div className="border-b border-border px-2 py-1.5">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Buscar tag…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                    </div>
                    <ul role="listbox" className="max-h-48 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <li className="px-3 py-2 text-[10px] text-muted-foreground">
                                {tags.length === 0 ? "Nenhuma tag criada ainda." : "Nenhuma tag encontrada."}
                            </li>
                        ) : (
                            filtered.map((tag) => {
                                const isSelected = selectedIds.includes(tag.id)
                                return (
                                    <li
                                        key={tag.id}
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => toggle(tag.id)}
                                        className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors"
                                    >
                                        <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                                        <span className="flex-1 text-xs text-foreground truncate">{tag.name}</span>
                                        {isSelected && <Check className="h-3 w-3 shrink-0 text-foreground" />}
                                    </li>
                                )
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    )
}
