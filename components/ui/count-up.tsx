"use client"

import { useEffect, useRef, useState } from "react"

import { easeOut, MOTION, prefersReducedMotion } from "@/lib/motion"

const NUMBER = /^(\D*?)(-?\d+(?:[.,]\d+)?)([\s\S]*)$/

function parse(text: string) {
    const match = NUMBER.exec(text)
    if (!match) return null
    const [, prefix, raw, suffix] = match
    const separator = raw.includes(",") ? "," : "."
    const decimals = raw.includes(separator) ? raw.split(separator)[1].length : 0
    return { prefix, value: parseFloat(raw.replace(",", ".")), decimals, separator, suffix }
}

function format(n: number, decimals: number, separator: string) {
    const fixed = n.toFixed(decimals)
    return separator === "," ? fixed.replace(".", ",") : fixed
}

/**
 * Counts a number up to its value: "9.3h", "177.9 hrs", "45%", "3d" — or pass a number and
 * a `suffix`. Keeps the source's decimals.
 *
 * First mount tweens from 0; when the value later changes it tweens from what is on screen,
 * so a data refresh nudges the figure instead of replaying from zero. Reduced motion shows
 * the final value immediately. An invisible copy of the final text reserves the width, so
 * digits appearing never move neighbours; assistive tech reads the final value.
 */
export function CountUp({
    value,
    suffix = "",
    className,
}: {
    value: string | number
    suffix?: string
    className?: string
}) {
    const text = `${value}${suffix}`
    const parsed = parse(text)
    const target = parsed?.value ?? 0
    const decimals = parsed?.decimals ?? 0
    const separator = parsed?.separator ?? "."
    const [shown, setShown] = useState(0)
    const shownRef = useRef(0)
    const frame = useRef<number | undefined>(undefined)

    useEffect(() => {
        if (!parsed) return
        const from = shownRef.current
        if (from === target) return
        const instant = prefersReducedMotion()
        let start: number | null = null
        const tick = (now: number) => {
            if (start === null) start = now
            const t = instant ? 1 : Math.min((now - start) / MOTION.count, 1)
            const current = from + (target - from) * easeOut(t)
            shownRef.current = current
            setShown(current)
            if (t < 1) frame.current = requestAnimationFrame(tick)
        }
        frame.current = requestAnimationFrame(tick)
        return () => {
            if (frame.current !== undefined) cancelAnimationFrame(frame.current)
        }
        // `parsed` is derived from `text`; the primitives below are what matter.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, parsed === null])

    if (!parsed) return <span className={className}>{text}</span>

    const live = `${parsed.prefix}${format(shown, decimals, separator)}${parsed.suffix}`
    return (
        <span className={`relative inline-block num ${className ?? ""}`}>
            <span className="sr-only">{text}</span>
            <span aria-hidden="true" className="invisible">{text}</span>
            <span aria-hidden="true" className="absolute inset-0 whitespace-nowrap">{live}</span>
        </span>
    )
}
