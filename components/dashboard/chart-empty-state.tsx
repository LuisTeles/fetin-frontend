"use client"

import Link from "next/link"
import { BarChart2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChartEmptyStateProps {
    title?: string
    description?: string
    ctaLabel?: string
    ctaHref?: string
}

export function ChartEmptyState({
    title = "Sem dados ainda",
    description = "Gere um cronograma para começar a ver as métricas.",
    ctaLabel = "Gerar Cronograma",
    ctaHref = "/auto-schedule",
}: ChartEmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/50 bg-muted/20 p-8 text-center">
            <div className="rounded-full bg-muted p-3">
                <BarChart2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
            {ctaLabel && ctaHref && (
                <Link
                    href={ctaHref}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-1")}
                >
                    {ctaLabel}
                </Link>
            )}
        </div>
    )
}
