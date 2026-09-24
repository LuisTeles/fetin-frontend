"use client"

import { ChevronDown, EyeOff } from "lucide-react"

import { DASHBOARD_SECTIONS, type SectionId } from "@/lib/dashboard-layout"
import { useDashboardLayout } from "./dashboard-layout-provider"

/**
 * Wraps one dashboard widget with a slim control bar: a chevron that collapses the section to
 * its header and a button that removes it from the page. The widget itself is passed as
 * children, so it stays a Server Component and keeps fetching on the server.
 *
 * A collapsed body is folded with a grid-row transition and marked `inert`, so its contents
 * are neither focusable nor read by assistive technology while hidden.
 */
export function DashboardSection({ id, children }: { id: SectionId; children: React.ReactNode }) {
    const { layout, toggle, hide } = useDashboardLayout()
    const collapsed = layout.collapsed.includes(id)
    const label = DASHBOARD_SECTIONS.find((s) => s.id === id)?.label ?? id
    const bodyId = `dashboard-section-${id}`

    return (
        <section aria-label={label} className="min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={() => toggle(id)}
                    aria-expanded={!collapsed}
                    aria-controls={bodyId}
                    className="group flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ChevronDown
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
                    />
                    <span className="truncate">{label}</span>
                    <span className="sr-only">{collapsed ? " (recolhida, expandir)" : " (expandida, recolher)"}</span>
                </button>
                <button
                    type="button"
                    onClick={() => hide(id)}
                    aria-label={`Ocultar seção ${label}`}
                    title="Ocultar seção (você pode restaurá-la em Personalizar)"
                    className="rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            </div>

            <div
                id={bodyId}
                className="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
                style={{ gridTemplateRows: collapsed ? "0fr" : "1fr" }}
            >
                <div className="min-h-0 overflow-hidden" inert={collapsed}>
                    {children}
                </div>
            </div>
        </section>
    )
}
