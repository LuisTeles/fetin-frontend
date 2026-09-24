"use client"

import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MOTION, prefersReducedMotion } from "@/lib/motion"

export function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">("light")
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const isDark = document.documentElement.classList.contains("dark")
        setTheme(isDark ? "dark" : "light")
    }, [])

    function toggleTheme() {
        const nextTheme = theme === "light" ? "dark" : "light"
        const root = document.documentElement

        // Colour transition is scoped to the toggle itself so first load never animates
        // (the inline script in app/layout.tsx sets the class before paint).
        if (!prefersReducedMotion()) {
            root.classList.add("theme-transition")
            window.setTimeout(() => root.classList.remove("theme-transition"), MOTION.enter)
        }

        if (nextTheme === "dark") {
            root.classList.add("dark")
            localStorage.setItem("theme", "dark")
        } else {
            root.classList.remove("dark")
            localStorage.setItem("theme", "light")
        }

        setTheme(nextTheme)
    }

    if (!mounted) {
        return (
            <div className="size-8 border border-border/80 rounded-lg bg-muted/10 shrink-0" />
        )
    }

    const isDark = theme === "dark"

    return (
        <Button
            onClick={toggleTheme}
            variant="outline"
            size="icon"
            className="relative size-8 border-border/60 hover:bg-muted/50 hover:text-foreground shrink-0 shadow-xs"
            title={theme === "light" ? "Mudar para modo escuro" : "Mudar para modo claro"}
        >
            {/* Both icons stay mounted; the inactive one rotates out and fades. */}
            <Moon
                className={`absolute h-4 w-4 text-foreground/80 transition-[opacity,transform] duration-200 ease-out ${
                    isDark ? "-rotate-90 opacity-0" : "rotate-0 opacity-100"
                }`}
            />
            <Sun
                className={`absolute h-4 w-4 text-foreground/80 transition-[opacity,transform] duration-200 ease-out ${
                    isDark ? "rotate-0 opacity-100" : "rotate-90 opacity-0"
                }`}
            />
        </Button>
    )
}
