"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"

export function DashboardActions() {
    const router = useRouter()
    const [isLoadingLogout, setIsLoadingLogout] = useState(false)
    const [isDeletingAccount, setIsDeletingAccount] = useState(false)

    async function logout() {
        setIsLoadingLogout(true)
        await fetch("/api/auth/logout", { method: "POST" })
        router.replace("/login")
        router.refresh()
    }

    async function deleteAccount() {
        const confirmed = window.confirm(
            "Deseja realmente excluir sua conta? Esta acao e irreversivel."
        )

        if (!confirmed) {
            return
        }

        setIsDeletingAccount(true)

        const response = await fetch("/api/auth/me", {
            method: "DELETE",
        })

        if (response.ok) {
            router.replace("/signup")
            router.refresh()
            return
        }

        setIsDeletingAccount(false)
        window.alert("Nao foi possivel excluir a conta. Tente novamente.")
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button onClick={logout} variant="outline" disabled={isLoadingLogout}>
                {isLoadingLogout ? "Saindo..." : "Logout"}
            </Button>
            <Button
                onClick={deleteAccount}
                variant="destructive"
                disabled={isDeletingAccount}
            >
                {isDeletingAccount ? "Excluindo..." : "Excluir conta"}
            </Button>
        </div>
    )
}
