"use client"

import { useEffect, useState } from "react"

export function useNivoTheme() {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        const checkDark = () => {
            setIsDark(document.documentElement.classList.contains("dark"))
        }

        checkDark()

        const observer = new MutationObserver(checkDark)
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        })

        return () => observer.disconnect()
    }, [])

    // Mirrors --text / --text-muted / --border in globals.css (Nivo needs concrete colours).
    const textColor = isDark ? "#f3f4f6" : "#1f2937"
    const subtextColor = isDark ? "#d1d5db" : "#4b5563"
    const borderColor = isDark ? "#374151" : "#e5e7eb"
    const gridColor = isDark ? "#27272a" : "#f4f4f5"
    // Mirrors --brand (indigo). Primary chart series.
    const brand = isDark ? "#818cf8" : "#4f46e5"
    const fontFamily = "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"

    const theme = {
        background: "transparent",
        text: {
            fontFamily,
            fontSize: 11,
            fill: textColor,
            outlineWidth: 0,
            outlineColor: "transparent",
        },
        axis: {
            domain: {
                line: {
                    stroke: borderColor,
                    strokeWidth: 1,
                },
            },
            legend: {
                text: {
                    fontFamily,
                    fontSize: 11,
                    fill: textColor,
                },
            },
            ticks: {
                line: {
                    stroke: borderColor,
                    strokeWidth: 1,
                },
                text: {
                    fontFamily,
                    fontSize: 11,
                    fill: subtextColor,
                    fontWeight: 500,
                },
            },
        },
        grid: {
            line: {
                stroke: gridColor,
                strokeWidth: 1,
            },
        },
        legends: {
            text: {
                fontFamily,
                fontSize: 11,
                fill: textColor,
            },
        },
        tooltip: {
            container: {
                background: isDark ? "#18181b" : "#ffffff",
                color: isDark ? "#f4f4f5" : "#09090b",
                fontFamily,
                fontSize: 12,
                borderRadius: "8px",
                border: `1px solid ${borderColor}`,
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
            },
        },
    }

    return { theme, isDark, textColor, subtextColor, brand }
}
