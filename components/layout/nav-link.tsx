"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    BookOpen,
    CalendarDays,
    Clock,
    GraduationCap,
    LayoutDashboard,
    ListChecks,
    ShieldCheck,
    Sparkles,
    StickyNote,
    User,
    type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = {
    dashboard: LayoutDashboard,
    sessions: ListChecks,
    profile: User,
    exams: GraduationCap,
    subjects: BookOpen,
    calendar: CalendarDays,
    notes: StickyNote,
    schedule: Sparkles,
    availability: Clock,
    admin: ShieldCheck,
}

export type NavIcon = keyof typeof ICONS

export function NavLink({
    href,
    icon,
    children,
}: {
    href: string
    icon: NavIcon
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isActive = pathname === href || pathname.startsWith(`${href}/`)
    const Icon = ICONS[icon]

    return (
        <Link
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
                "relative z-10 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                    ? "text-brand"
                    : "text-text-muted hover:bg-surface-muted hover:text-text",
            )}
        >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{children}</span>
        </Link>
    )
}
