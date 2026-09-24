"use client"

import Link from "next/link"
import { User } from "lucide-react"
import { useEffect, useState } from "react"

function initialsOf(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
}

/** Header avatar (initials) linking to "Meu perfil". Always the signed-in user, never the impersonated one. */
export function UserAvatar() {
    const [name, setName] = useState<string | null>(null)

    useEffect(() => {
        fetch("/api/auth/me")
            .then((res) => res.json())
            .then((data) => {
                if (data?.user?.name) setName(data.user.name)
            })
            .catch(() => {})
    }, [])

    return (
        <Link
            href="/me"
            title={name ? `Meu perfil — ${name}` : "Meu perfil"}
            aria-label="Meu perfil"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            {name ? initialsOf(name) : <User className="size-4" />}
        </Link>
    )
}
