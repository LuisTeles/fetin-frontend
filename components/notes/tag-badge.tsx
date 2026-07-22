"use client"

import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// Auto-compute readable text color (black or white) from a hex background
function getContrastColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    // Luminance formula (WCAG)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? "#1a1a1a" : "#ffffff"
}

interface TagBadgeProps {
    name: string
    color: string
    onRemove?: () => void
    className?: string
    size?: "sm" | "md"
}

export function TagBadge({ name, color, onRemove, className, size = "sm" }: TagBadgeProps) {
    const textColor = getContrastColor(color)

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full font-medium transition-all",
                size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
                className,
            )}
            style={{ backgroundColor: color, color: textColor }}
        >
            {name}
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="ml-0.5 rounded-full opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
                    style={{ color: textColor }}
                    aria-label={`Remover tag ${name}`}
                >
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </span>
    )
}
