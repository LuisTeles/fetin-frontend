"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Archive, Copy, Plus, Trash2 } from "lucide-react"

import { nativeSelectClass } from "@/components/flashcards/native-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { formatDateSafe, pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
    apiArchivePreset, apiCreatePreset, apiDeletePreset, apiDuplicatePreset, apiGetPresets,
    STATUS_LABEL, type PresetStatus, type PresetSummary,
} from "@/lib/api/presets"

export default function PresetsPage() {
    const router = useRouter()
    const [presets, setPresets] = useState<PresetSummary[]>([])
    const [status, setStatus] = useState<PresetStatus | "">("")
    const [name, setName] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        try {
            setPresets(await apiGetPresets(status || undefined))
            setError(null)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao carregar presets.")
        } finally {
            setLoading(false)
        }
    }, [status])

    useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t) }, [load])

    async function run(action: () => Promise<unknown>) {
        setBusy(true)
        try {
            await action()
            await load()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro inesperado.")
        } finally {
            setBusy(false)
        }
    }

    async function create(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) return
        setBusy(true)
        try {
            const created = await apiCreatePreset({ name: name.trim() })
            router.push(`/presets/${created.id}`)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao criar preset.")
            setBusy(false)
        }
    }

    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
                <h1 className="page-title">Meus presets</h1>
                <p className="text-xs text-muted-foreground">Cada preset é uma turma pronta (disciplina, tópicos e provas) que seus alunos aplicam de uma vez.</p>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <div className="flex flex-wrap items-center justify-between gap-2">
                <form onSubmit={create} className="flex flex-wrap gap-2">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da turma (ex.: Cálculo I)" aria-label="Nome do novo preset" maxLength={120} className="h-9 w-64" />
                    <Button type="submit" disabled={busy || !name.trim()} className="gap-1"><Plus />Novo preset</Button>
                </form>
                <select value={status} onChange={(e) => setStatus(e.target.value as PresetStatus | "")} aria-label="Filtrar por status" className={nativeSelectClass}>
                    <option value="">Todos</option>
                    {(Object.keys(STATUS_LABEL) as PresetStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
            </div>

            {loading ? (
                <p className="text-xs text-muted-foreground">Carregando…</p>
            ) : presets.length === 0 ? (
                <Card><EmptyState icon={<Plus />} message="Nenhum preset por aqui. Crie o primeiro acima." /></Card>
            ) : (
                <Card>
                    <CardContent className="divide-y divide-border/40 px-4">
                        {presets.map((p) => (
                            <div key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 space-y-0.5">
                                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                                        <Link href={`/presets/${p.id}`} className="hover:underline">{p.name}</Link>
                                        <Badge variant={p.status === "published" ? "default" : "outline"} className="text-[10px]">{STATUS_LABEL[p.status]}</Badge>
                                        {p.version > 0 && <span className="text-xs font-normal text-muted-foreground">v{p.version}</span>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {pluralize(p.topic_count ?? 0, "tópico", "tópicos")} · {pluralize(p.assessment_count ?? 0, "avaliação", "avaliações")} · editado em {formatDateSafe(p.updated_at)}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Link href={`/presets/${p.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}>Editar</Link>
                                    {p.version > 0 && (
                                        <Link href={`/presets/${p.id}/insights`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}>Progresso</Link>
                                    )}
                                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => apiDuplicatePreset(p.id))} className="gap-1 text-xs"><Copy className="h-3.5 w-3.5" />Duplicar</Button>
                                    {p.status !== "archived" && (
                                        <Button size="sm" variant="ghost" disabled={busy} className="gap-1 text-xs" onClick={() => {
                                            if (window.confirm(`Arquivar "${p.name}"? Ninguém mais poderá aplicá-lo; quem já aplicou mantém a cópia. Não dá para desarquivar.`)) void run(() => apiArchivePreset(p.id))
                                        }}><Archive className="h-3.5 w-3.5" />Arquivar</Button>
                                    )}
                                    <Button size="sm" variant="destructive" disabled={busy} className="gap-1 text-xs" onClick={() => {
                                        if (window.confirm(`Excluir "${p.name}"? Se algum aluno já aplicou, o sistema recusa: arquive em vez de excluir.`)) void run(() => apiDeletePreset(p.id))
                                    }}><Trash2 className="h-3.5 w-3.5" />Excluir</Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </section>
    )
}
