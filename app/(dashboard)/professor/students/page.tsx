"use client"

import { useCallback, useEffect, useState } from "react"
import { Copy, RefreshCw, UserMinus, Users } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDateSafe } from "@/lib/format"
import { apiGetInviteCode, apiGetRoster, apiRemoveStudent, apiRotateInviteCode, type RosterItem } from "@/lib/api/presets"

export default function ProfessorStudentsPage() {
    const [code, setCode] = useState<string | null>(null)
    const [roster, setRoster] = useState<RosterItem[]>([])
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        try {
            const [c, r] = await Promise.all([apiGetInviteCode(), apiGetRoster()])
            setCode(c)
            setRoster(r)
            setError(null)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao carregar.")
        }
    }, [])

    useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t) }, [load])

    async function rotate() {
        if (!window.confirm("Gerar um novo código? O código atual deixa de valer para novos alunos; quem já está vinculado continua vinculado.")) return
        setBusy(true)
        try {
            setCode(await apiRotateInviteCode())
            setNotice("Novo código gerado.")
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao gerar código.")
        } finally {
            setBusy(false)
        }
    }

    async function copy() {
        if (!code) return
        try {
            await navigator.clipboard.writeText(code)
            setNotice("Código copiado.")
        } catch {
            setNotice("Copie o código manualmente.")
        }
    }

    async function remove(s: RosterItem) {
        if (!window.confirm(`Remover ${s.name} da turma? Ele deixa de ver seus presets; o que já aplicou continua com ele. Ele pode se vincular de novo com o código.`)) return
        setBusy(true)
        try {
            await apiRemoveStudent(s.link_id)
            await load()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao remover aluno.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
                <h1 className="page-title">Meus alunos</h1>
                <p className="text-xs text-muted-foreground">Compartilhe o código da turma. Aqui você vê apenas o nome de quem se vinculou — nenhum dado de estudo.</p>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {notice && <Alert><AlertDescription>{notice}</AlertDescription></Alert>}

            <Card>
                <CardHeader className="px-4">
                    <CardTitle className="text-sm font-bold">Código da turma</CardTitle>
                    <CardDescription className="text-xs">Alunos digitam este código em Turmas › Entrar em uma turma.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3 px-4">
                    <code className="rounded-md bg-muted px-3 py-1.5 font-mono text-lg tracking-widest">{code ?? "········"}</code>
                    <Button variant="outline" size="sm" onClick={copy} disabled={!code} className="gap-1"><Copy />Copiar</Button>
                    <Button variant="outline" size="sm" onClick={rotate} disabled={busy || !code} className="gap-1"><RefreshCw />Gerar novo</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="px-4"><CardTitle className="text-sm font-bold">Alunos vinculados ({roster.length})</CardTitle></CardHeader>
                <CardContent className="px-4">
                    {roster.length === 0 ? (
                        <EmptyState icon={<Users />} message="Ninguém se vinculou ainda." />
                    ) : (
                        <ul className="divide-y divide-border/40">
                            {roster.map((s) => (
                                <li key={s.link_id} className="flex items-center justify-between gap-2 py-2 text-sm">
                                    <span>{s.name} <span className="text-xs text-muted-foreground">· desde {formatDateSafe(s.linked_at)}</span></span>
                                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(s)} className="gap-1 text-xs"><UserMinus className="h-3.5 w-3.5" />Remover</Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </section>
    )
}
