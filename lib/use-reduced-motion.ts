"use client"

import { useEffect, useState } from "react"

/**
 * Tracks `prefers-reduced-motion`.
 *
 * Nivo animates its marks by default, which is exactly the kind of motion the media
 * query exists to suppress. Charts read this and pass `animate={!reducedMotion}`.
 *
 * Starts `false` so server and first client render agree — the effect corrects it before
 * paint for users who asked for less motion.
 */
export function useReducedMotion(): boolean {
    const [reducedMotion, setReducedMotion] = useState(false)

    useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)")
        setReducedMotion(query.matches)

        const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
        query.addEventListener("change", onChange)
        return () => query.removeEventListener("change", onChange)
    }, [])

    return reducedMotion
}
