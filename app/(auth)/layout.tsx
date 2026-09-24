import { GraduationCap } from "lucide-react"

import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>
            <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
                    <GraduationCap className="size-5" />
                </span>
                <span className="text-xl font-semibold tracking-tight">Fetin</span>
            </div>
            <div className="w-full max-w-sm">{children}</div>
        </div>
    )
}
