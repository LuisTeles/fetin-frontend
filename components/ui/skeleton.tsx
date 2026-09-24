import { cn } from "@/lib/utils"

/** Loading placeholder with a soft shimmer sweep (see `.shimmer` in app/motion.css). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            aria-hidden="true"
            className={cn("shimmer rounded-md bg-muted", className)}
            {...props}
        />
    )
}

export { Skeleton }
