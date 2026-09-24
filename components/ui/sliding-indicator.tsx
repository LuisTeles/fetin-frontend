"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

/** Elements that mark the active option. Set one on the active child. */
const ACTIVE_SELECTOR = '[data-active="true"], [aria-current="page"], [aria-selected="true"]'

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect

type Box = { x: number; y: number; w: number; h: number }

/**
 * Wraps a group of options and slides a pill (or underline) under the active one.
 *
 * The children keep rendering as they do today — this only measures the element matching
 * ACTIVE_SELECTOR and animates `transform` + size to it (see `.slide-indicator` in
 * app/motion.css). It works with server-rendered children (sidebar links) because it reads
 * the DOM, and re-measures on route change, on `watch` change and on resize.
 *
 * The first measurement is applied with the transition off so the pill never slides in
 * from the corner. It renders behind the options (`z-0`); give options `relative z-10`.
 */
export function SlidingIndicator({
    as: Tag = "div",
    className,
    indicatorClassName,
    variant = "pill",
    watch,
    children,
    ...rest
}: {
    as?: "div" | "ul" | "nav"
    className?: string
    /** Extra classes for the moving element, e.g. its colour. */
    indicatorClassName?: string
    /** `pill` fills the active option; `underline` is a 2px bar on its bottom edge. */
    variant?: "pill" | "underline"
    /** Any value whose change should re-measure (e.g. the selected tab in client state). */
    watch?: unknown
    children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
    const pathname = usePathname()
    const containerRef = useRef<HTMLElement>(null)
    const [box, setBox] = useState<Box | null>(null)
    const [ready, setReady] = useState(false)

    const measure = useCallback(() => {
        const container = containerRef.current
        const active = container?.querySelector<HTMLElement>(ACTIVE_SELECTOR)
        if (!container || !active) {
            setBox(null)
            return
        }
        // offset* is unaffected by transforms on the option itself and is relative to the
        // positioned container, which is what we need.
        const next = { x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight }
        setBox((prev) =>
            prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h ? prev : next,
        )
    }, [])

    useIsoLayoutEffect(() => {
        measure()
    }, [measure, pathname, watch, children])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const observer = new ResizeObserver(measure)
        observer.observe(container)
        return () => observer.disconnect()
    }, [measure])

    // Enable the transition only after the first box has been painted.
    useEffect(() => {
        if (box && !ready) {
            const id = requestAnimationFrame(() => setReady(true))
            return () => cancelAnimationFrame(id)
        }
    }, [box, ready])

    const underline = variant === "underline"
    const style: React.CSSProperties = box
        ? underline
            ? { width: box.w, height: 2, transform: `translate(${box.x}px, ${box.y + box.h - 2}px)` }
            : { width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)` }
        : {}

    return (
        <Tag
            ref={containerRef as never}
            className={cn("relative", className)}
            {...rest}
        >
            <span
                aria-hidden="true"
                data-ready={box ? String(ready) : "false"}
                style={style}
                className={cn(
                    "slide-indicator z-0",
                    underline ? "rounded-full bg-brand" : "rounded-lg bg-brand-subtle",
                    indicatorClassName,
                )}
            />
            {children}
        </Tag>
    )
}
