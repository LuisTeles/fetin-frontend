import { Info } from "lucide-react"

/**
 * A small "?" that explains a metric on hover or keyboard focus.
 *
 * CSS-only (group-hover / group-focus-within), so it works in Server Components and adds no
 * client JavaScript. The text is also exposed to assistive tech through `aria-describedby`.
 */
export function InfoTip({
    children,
    label = "O que significa",
    id,
    align = "left",
}: {
    children: React.ReactNode
    label?: string
    /** Unique id so aria-describedby can point at the tooltip text. */
    id: string
    align?: "left" | "right"
}) {
    return (
        <span className="group/tip relative inline-flex align-middle">
            <button
                type="button"
                aria-label={label}
                aria-describedby={id}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
                <Info className="h-3 w-3" aria-hidden="true" />
            </button>
            <span
                id={id}
                role="tooltip"
                className={`pointer-events-none absolute top-full z-20 mt-1 hidden w-64 rounded-md border bg-popover px-3 py-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-popover-foreground shadow-md group-hover/tip:block group-focus-within/tip:block ${
                    align === "right" ? "right-0" : "left-0"
                }`}
            >
                {children}
            </span>
        </span>
    )
}
