"use client"

import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

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
        
        if (nextTheme === "dark") {
            document.documentElement.classList.add("dark")
            localStorage.setItem("theme", "dark")
        } else {
            document.documentElement.classList.remove("dark")
            localStorage.setItem("theme", "light")
        }
        
        setTheme(nextTheme)
    }

    if (!mounted) {
        return (
            <div className="size-8 border border-border/80 rounded-lg bg-muted/10 shrink-0" />
        )
    }

    return (
        <Button
            onClick={toggleTheme}
            variant="outline"
            size="icon"
            className="size-8 border-border/60 hover:bg-muted/50 hover:text-foreground shrink-0 shadow-xs"
            title={theme === "light" ? "Mudar para modo escuro" : "Mudar para modo claro"}
        >
            {theme === "light" ? (
                <Moon className="h-4 w-4 text-foreground/80" />
            ) : (
                <Sun className="h-4 w-4 text-foreground/80" />
            )}
        </Button>
    )
}
