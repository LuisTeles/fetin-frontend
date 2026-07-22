"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

// 8 curated study-themed hex presets
export const TAG_COLOR_PRESETS = [
    { hex: "#3B82F6", name: "Azul" },
    { hex: "#10B981", name: "Verde" },
    { hex: "#8B5CF6", name: "Roxo" },
    { hex: "#F59E0B", name: "Âmbar" },
    { hex: "#EF4444", name: "Vermelho" },
    { hex: "#EC4899", name: "Rosa" },
    { hex: "#14B8A6", name: "Teal" },
    { hex: "#6B7280", name: "Cinza" },
]

interface ColorPalettePickerProps {
    value: string
    onChange: (hex: string) => void
    disabled?: boolean
}

// Simple inline contrast check
function isLight(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5
}

export function ColorPalettePicker({ value, onChange, disabled }: ColorPalettePickerProps) {
    const [showCustom, setShowCustom] = useState(false)
    const isPreset = TAG_COLOR_PRESETS.some((p) => p.hex === value)

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                {TAG_COLOR_PRESETS.map((preset) => (
                    <button
                        key={preset.hex}
                        type="button"
                        disabled={disabled}
                        title={preset.name}
                        aria-label={`Cor ${preset.name}`}
                        onClick={() => onChange(preset.hex)}
                        className={cn(
                            "relative h-7 w-7 rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring active:scale-95 cursor-pointer",
                            value === preset.hex
                                ? "border-foreground/50 scale-110 shadow-md"
                                : "border-black/10 hover:scale-105",
                        )}
                        style={{ backgroundColor: preset.hex }}
                    >
                        {value === preset.hex && (
                            <Check
                                className="absolute inset-0 m-auto h-3.5 w-3.5"
                                style={{ color: isLight(preset.hex) ? "#1a1a1a" : "#fff" }}
                            />
                        )}
                    </button>
                ))}

                {/* Custom color toggle */}
                <button
                    type="button"
                    disabled={disabled}
                    title="Cor personalizada"
                    aria-label="Inserir cor personalizada"
                    onClick={() => setShowCustom((v) => !v)}
                    className={cn(
                        "h-7 w-7 rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground text-[10px] font-bold hover:border-foreground/40 hover:text-foreground transition-all cursor-pointer",
                        !isPreset && "border-foreground/60 text-foreground",
                    )}
                >
                    #
                </button>
            </div>

            {/* Hex input for custom color */}
            {showCustom && (
                <div className="flex items-center gap-2">
                    <div
                        className="h-6 w-6 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: value }}
                    />
                    <input
                        type="text"
                        maxLength={7}
                        disabled={disabled}
                        placeholder="#F472B6"
                        defaultValue={!isPreset ? value : "#"}
                        onChange={(e) => {
                            const v = e.target.value
                            if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                                onChange(v)
                            }
                        }}
                        className="flex h-8 w-28 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-[10px] text-muted-foreground">ex: #F472B6</span>
                </div>
            )}
        </div>
    )
}
