"use client"

import { usePathname } from "next/navigation"

/**
 * Replays the page-enter animation on every route change. Keyed on the pathname because
 * `template.tsx` does not remount for nested navigation (/subjects → /subjects/[id]) and
 * must not replay for search-param changes (dashboard range filter).
 */
export function PageEnter({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    return (
        <div key={pathname} className="page-enter">
            {children}
        </div>
    )
}
