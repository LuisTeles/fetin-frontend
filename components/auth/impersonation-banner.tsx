"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ImpersonationBanner() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const userId = searchParams.get("userId")
    const [userName, setUserName] = useState<string | null>(null)

    useEffect(() => {
        if (!userId) return
        fetch(`/api/auth/me?userId=${userId}`)
            .then((res) => res.json())
            .then((data) => {
                if (data?.user?.name) {
                    setUserName(data.user.name)
                }
            })
            .catch(() => {})
    }, [userId])

    if (!userId) return null

    return (
        <div className="bg-yellow-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between gap-4 sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                    Modo de Visualização: Você está visualizando o painel de{" "}
                    <strong>{userName || `ID ${userId}`}</strong>. Operações de escrita estão bloqueadas.
                </span>
            </div>
            <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 hover:bg-yellow-700 text-white gap-1 font-bold text-xs border border-white/20"
                onClick={() => {
                    router.push("/admin/users")
                }}
            >
                <X className="h-3.5 w-3.5" /> Encerrar Visualização
            </Button>
        </div>
    )
}
