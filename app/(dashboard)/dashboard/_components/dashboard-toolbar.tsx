"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronsDownUp, ChevronsUpDown, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DASHBOARD_SECTIONS, allCollapsed, visibleSections } from "@/lib/dashboard-layout"
import { useDashboardLayout } from "./dashboard-layout-provider"

/**
 * Page-level controls: collapse/expand every visible section at once, and "Personalizar", a
 * checklist to bring back sections that were removed (or remove them from one place).
 */
export function DashboardToolbar() {
    const { layout, setAll, hide, show, reset, isRefreshing } = useDashboardLayout()
    const [open, setOpen] = useState(false)
    const panelRef = useRef<HTMLDivElement>(null)

    const visibleCount = visibleSections(layout).length
    const everythingCollapsed = allCollapsed(layout)
    const customised = layout.hidden.length > 0 || layout.collapsed.length > 0

    // Close on outside click and on Escape.
    useEffect(() => {
        if (!open) return
        const onPointerDown = (e: PointerEvent) => {
            if (!panelRef.current?.contains(e.target as Node)) setOpen(false)
        }
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false)
        }
        document.addEventListener("pointerdown", onPointerDown)
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("pointerdown", onPointerDown)
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [open])

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                disabled={visibleCount === 0}
                onClick={() => setAll(!everythingCollapsed)}
            >
                {everythingCollapsed ? (
                    <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                    <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {everythingCollapsed ? "Expandir tudo" : "Recolher tudo"}
            </Button>

            <div className="relative" ref={panelRef}>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    aria-haspopup="true"
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                >
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                    Personalizar
                    {layout.hidden.length > 0 && (
                        <span className="rounded-full bg-brand/15 px-1.5 text-[10px] font-semibold text-brand">
                            {layout.hidden.length} oculta{layout.hidden.length === 1 ? "" : "s"}
                        </span>
                    )}
                </Button>

                {open && (
                    <div
                        role="group"
                        aria-label="Seções do painel"
                        className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
                    >
                        <p className="mb-2 text-xs font-semibold">Mostrar no painel</p>
                        <ul className="space-y-1">
                            {DASHBOARD_SECTIONS.map((section) => {
                                const visible = !layout.hidden.includes(section.id)
                                return (
                                    <li key={section.id}>
                                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-muted">
                                            <input
                                                type="checkbox"
                                                checked={visible}
                                                onChange={() => (visible ? hide(section.id) : show(section.id))}
                                                className="h-3.5 w-3.5 accent-[var(--brand)]"
                                            />
                                            <span className="min-w-0 flex-1 truncate">{section.label}</span>
                                        </label>
                                    </li>
                                )
                            })}
                        </ul>
                        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
                            <span className="text-[11px] text-muted-foreground" aria-live="polite">
                                {isRefreshing ? "Atualizando…" : "Salvo neste navegador"}
                            </span>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={!customised} onClick={reset}>
                                Restaurar padrão
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
