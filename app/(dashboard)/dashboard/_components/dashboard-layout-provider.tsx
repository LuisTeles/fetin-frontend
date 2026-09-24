"use client"

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
    type DashboardLayout,
    type SectionId,
    hideSection,
    layoutCookie,
    resetLayout,
    setAllCollapsed,
    showSection,
    toggleCollapsed,
} from "@/lib/dashboard-layout"

interface LayoutContextValue {
    layout: DashboardLayout
    toggle: (id: SectionId) => void
    setAll: (collapsed: boolean) => void
    hide: (id: SectionId) => void
    show: (id: SectionId) => void
    reset: () => void
    /** True while the server re-renders after a section was shown or hidden. */
    isRefreshing: boolean
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

export function useDashboardLayout(): LayoutContextValue {
    const value = useContext(LayoutContext)
    if (!value) throw new Error("useDashboardLayout must be used inside <DashboardLayoutProvider>")
    return value
}

/**
 * Holds the layout in state (so collapsing is instant) and mirrors every change into the cookie
 * the Server Component reads. Collapsing is purely visual and needs no server round trip;
 * hiding or showing a section changes WHICH widgets the server renders and fetches, so those
 * two call `router.refresh()`.
 */
export function DashboardLayoutProvider({
    initial,
    children,
}: {
    initial: DashboardLayout
    children: React.ReactNode
}) {
    const router = useRouter()
    const [layout, setLayout] = useState<DashboardLayout>(initial)
    const [isRefreshing, startTransition] = useTransition()

    const apply = useCallback(
        (next: DashboardLayout, refresh: boolean) => {
            setLayout(next)
            document.cookie = layoutCookie(next)
            if (refresh) startTransition(() => router.refresh())
        },
        [router],
    )

    const value = useMemo<LayoutContextValue>(
        () => ({
            layout,
            isRefreshing,
            toggle: (id) => apply(toggleCollapsed(layout, id), false),
            setAll: (collapsed) => apply(setAllCollapsed(layout, collapsed), false),
            hide: (id) => apply(hideSection(layout, id), true),
            show: (id) => apply(showSection(layout, id), true),
            reset: () => apply(resetLayout(), true),
        }),
        [layout, isRefreshing, apply],
    )

    return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}
