"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * "Só provas futuras / Todos os tópicos" for the forgetting-curve card (F-14). The choice lives
 * in the URL (`?curves=all`), like the adherence range, so a view stays shareable.
 */
export function CurveScopeToggle() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const all = searchParams.get("curves") === "all"

    function hrefFor(showAll: boolean) {
        const next = new URLSearchParams(searchParams)
        if (showAll) next.set("curves", "all")
        else next.delete("curves")
        const qs = next.toString()
        return qs ? `${pathname}?${qs}` : pathname
    }

    const base = "rounded-lg px-2.5 py-1 text-xs transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    return (
        <nav aria-label="Tópicos da curva" className="flex items-center gap-1">
            <Link
                href={hrefFor(false)}
                scroll={false}
                aria-current={!all ? "page" : undefined}
                className={`${base} ${!all ? "font-medium text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
                Só provas futuras
            </Link>
            <Link
                href={hrefFor(true)}
                scroll={false}
                aria-current={all ? "page" : undefined}
                className={`${base} ${all ? "font-medium text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
                Todos os tópicos
            </Link>
        </nav>
    )
}
