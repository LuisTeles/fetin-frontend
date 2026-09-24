/**
 * Which dashboard sections the student sees, and which are collapsed.
 *
 * Kept in a neutral module (no "use client"), like `dashboard-range.ts`: the Server Component
 * page reads the cookie and calls these helpers, and the Client Components call them too. A
 * plain export of a "use client" file cannot be called from the server.
 *
 * The state lives in a cookie, not localStorage, so the server can read it: a hidden section
 * is never rendered and never fetches its data, and there is no flash of the wrong layout.
 */

export const DASHBOARD_SECTIONS = [
    { id: "kpis", label: "Indicadores da semana" },
    { id: "readiness", label: "Prontidão para Provas" },
    { id: "queue", label: "Fila de Estudo" },
    { id: "adherence", label: "Aderência ao Cronograma" },
    { id: "curve", label: "Curva de Esquecimento" },
    { id: "effectiveness", label: "Eficácia das Revisões" },
    { id: "heatmap", label: "Mapa de Calor de Atividade" },
    { id: "progress", label: "Progresso do plano por disciplina" },
    { id: "diverging", label: "Planejado × Estudado por dia" },
] as const

export type SectionId = (typeof DASHBOARD_SECTIONS)[number]["id"]

export interface DashboardLayout {
    /** Removed from the page (and from data fetching) until restored from "Personalizar". */
    hidden: SectionId[]
    /** Header only; the body is folded away. */
    collapsed: SectionId[]
}

export const LAYOUT_COOKIE = "fetin_dashboard_layout"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export const DEFAULT_LAYOUT: DashboardLayout = { hidden: [], collapsed: [] }

const VALID_IDS = new Set<string>(DASHBOARD_SECTIONS.map((s) => s.id))

function cleanIds(value: unknown): SectionId[] {
    if (!Array.isArray(value)) return []
    return [...new Set(value.filter((v): v is SectionId => typeof v === "string" && VALID_IDS.has(v)))]
}

/** Tolerant: a missing, corrupt or outdated cookie yields the default layout. */
export function parseLayout(raw: string | null | undefined): DashboardLayout {
    if (!raw) return { hidden: [], collapsed: [] }
    try {
        const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<DashboardLayout>
        return { hidden: cleanIds(parsed.hidden), collapsed: cleanIds(parsed.collapsed) }
    } catch {
        return { hidden: [], collapsed: [] }
    }
}

export function serializeLayout(layout: DashboardLayout): string {
    return encodeURIComponent(JSON.stringify(layout))
}

/** The `document.cookie` assignment for a layout (client side). */
export function layoutCookie(layout: DashboardLayout): string {
    return `${LAYOUT_COOKIE}=${serializeLayout(layout)}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`
}

export function visibleSections(layout: DashboardLayout): SectionId[] {
    return DASHBOARD_SECTIONS.map((s) => s.id).filter((id) => !layout.hidden.includes(id))
}

/** True when there is at least one visible section and all of them are collapsed. */
export function allCollapsed(layout: DashboardLayout): boolean {
    const visible = visibleSections(layout)
    return visible.length > 0 && visible.every((id) => layout.collapsed.includes(id))
}

export function toggleCollapsed(layout: DashboardLayout, id: SectionId): DashboardLayout {
    const collapsed = layout.collapsed.includes(id)
        ? layout.collapsed.filter((c) => c !== id)
        : [...layout.collapsed, id]
    return { ...layout, collapsed }
}

/** Collapse or expand every VISIBLE section; hidden sections stay hidden. */
export function setAllCollapsed(layout: DashboardLayout, collapsed: boolean): DashboardLayout {
    return { ...layout, collapsed: collapsed ? visibleSections(layout) : [] }
}

export function hideSection(layout: DashboardLayout, id: SectionId): DashboardLayout {
    if (layout.hidden.includes(id)) return layout
    return {
        hidden: [...layout.hidden, id],
        // A restored section comes back expanded.
        collapsed: layout.collapsed.filter((c) => c !== id),
    }
}

export function showSection(layout: DashboardLayout, id: SectionId): DashboardLayout {
    return { ...layout, hidden: layout.hidden.filter((h) => h !== id) }
}

export function resetLayout(): DashboardLayout {
    return { hidden: [], collapsed: [] }
}
