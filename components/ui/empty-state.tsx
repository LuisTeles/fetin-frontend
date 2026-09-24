import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    icon: ReactNode
    message: string
    /** Call to action — usually a <Button>/<Link>; omit when there is nothing to do yet. */
    action?: ReactNode
    /** "inline" fits inside a KPI card; "block" is for empty lists and panels. */
    variant?: "inline" | "block"
    className?: string
}

export function EmptyState({ icon, message, action, variant = "block", className }: EmptyStateProps) {
    if (variant === "inline") {
        return (
            <div className={cn("flex w-full items-center justify-between gap-2", className)}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md bg-muted p-1.5 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
                    <span>{message}</span>
                </div>
                {action}
            </div>
        )
    }
    return (
        <div className={cn("flex flex-col items-center gap-2 px-6 py-8 text-center", className)}>
            <span className="rounded-full bg-muted p-3 text-muted-foreground [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
            <p className="text-xs text-muted-foreground text-balance">{message}</p>
            {action}
        </div>
    )
}
