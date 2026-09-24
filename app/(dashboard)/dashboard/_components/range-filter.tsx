"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { DEFAULT_RANGE, parseRange, RANGE_OPTIONS } from "@/lib/dashboard-range"

/**
 * Time-range filter, held in the URL.
 *
 * `docs/dashboard.md` prescribed URL-driven state from the start and nothing implemented
 * it. Keeping the range in `searchParams` means a diagnostic view is shareable and
 * bookmarkable, the back button works, and the Server Component reads the value directly
 * — no client fetching, no SWR, no state duplicated between URL and component.
 *
 * These are real `<Link>`s rather than buttons with `router.push`, so Cmd/Ctrl+click and
 * middle-click open a range in a new tab like any other navigation.
 */

export function RangeFilter() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const active = parseRange(searchParams.get("range") ?? undefined)

    function hrefFor(value: string) {
        const next = new URLSearchParams(searchParams)
        // The default stays out of the URL, so the canonical view has a clean address.
        if (value === DEFAULT_RANGE) next.delete("range")
        else next.set("range", value)
        const qs = next.toString()
        return qs ? `${pathname}?${qs}` : pathname
    }

    return (
        <nav aria-label="Período de análise" className="flex items-center gap-1">
            {RANGE_OPTIONS.map((option) => {
                const isActive = option.value === active
                return (
                    <Link
                        key={option.value}
                        href={hrefFor(option.value)}
                        scroll={false}
                        aria-current={isActive ? "page" : undefined}
                        className={[
                            "rounded-lg px-2.5 py-1 text-xs num transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isActive
                                ? "bg-brand-subtle text-brand font-medium"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        ].join(" ")}
                    >
                        {option.label}
                    </Link>
                )
            })}
        </nav>
    )
}
