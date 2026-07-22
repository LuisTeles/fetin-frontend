"use client"

import { useState, useEffect } from "react"
import { Plus, StickyNote } from "lucide-react"
import { QuickNoteDrawer } from "@/components/notes/quick-note-drawer"
import { cn } from "@/lib/utils"

// ─── Component ────────────────────────────────────────────────────────────────

export function GlobalNoteFab() {
    const [isOpen, setIsOpen] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)
    const [hasPulsed, setHasPulsed] = useState(true)

    const [isMac, setIsMac] = useState(false)

    useEffect(() => {
        if (typeof window !== "undefined" && /Mac/i.test(navigator.userAgent)) {
            setIsMac(true)
        }
    }, [])

    // ── Global shortcut (Alt+N or Cmd+Shift+K) ───────────────────────────────
    useEffect(() => {
        function handleKeydown(e: KeyboardEvent) {
            const isAltN = e.altKey && (e.code === "KeyN" || e.key.toLowerCase() === "n")
            const isCmdShiftK = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.code === "KeyK" || e.key.toLowerCase() === "k")

            if (isAltN || isCmdShiftK) {
                e.preventDefault()
                setIsOpen((prev) => !prev)
            }
        }
        document.addEventListener("keydown", handleKeydown)
        return () => document.removeEventListener("keydown", handleKeydown)
    }, [])

    // Stop pulse after first hover
    function handleMouseEnter() {
        setShowTooltip(true)
        setHasPulsed(false)
    }

    const shortcutLabel = isMac ? "⌥N" : "Alt+N"

    return (
        <>
            {/* ── Floating Action Button ── */}
            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
                {/* Tooltip */}
                <div
                    className={cn(
                        "mb-1 rounded-lg border border-border bg-popover px-3 py-1.5 shadow-lg text-xs font-medium",
                        "transition-all duration-200 origin-bottom-right",
                        showTooltip && !isOpen
                            ? "opacity-100 scale-100 translate-y-0"
                            : "opacity-0 scale-95 translate-y-1 pointer-events-none",
                    )}
                >
                    <span className="flex items-center gap-2">
                        <StickyNote className="h-3 w-3 text-primary" />
                        Nova nota
                        <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[9px] font-mono text-muted-foreground">
                            {shortcutLabel}
                        </kbd>
                    </span>
                </div>

                {/* FAB Button */}
                <button
                    type="button"
                    id="global-quick-note-fab"
                    aria-label={`Criar nota rápida (${shortcutLabel})`}
                    onClick={() => setIsOpen(true)}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={() => setShowTooltip(false)}
                    className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-full shadow-lg",
                        "bg-primary text-primary-foreground",
                        "transition-all duration-200 ease-out",
                        "hover:scale-110 hover:shadow-xl active:scale-95",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer",
                        hasPulsed && "fab-pulse",
                    )}
                >
                    <Plus
                        className={cn(
                            "h-6 w-6 transition-transform duration-200",
                            isOpen && "rotate-45",
                        )}
                        strokeWidth={2.5}
                    />
                </button>
            </div>

            {/* ── Drawer ── */}
            <QuickNoteDrawer
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    )
}
