"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen, GraduationCap, KeyRound, Trash2, Unlink, UserMinus } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { formatDateSafe, pluralize } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
    apiGetAppliedClasses, apiGetClasses, apiGetProfessorLinks, apiJoinProfessor, apiLeaveProfessor, apiRemoveApplication,
    STATUS_LABEL, type AppliedClass, type ClassSummary, type ProfessorLinkItem,
} from "@/lib/api/presets"

export default function ClassesPage() {
    const [classes, setClasses] = useState<ClassSummary[]>([])
    const [links, setLinks] = useState<ProfessorLinkItem[]>([])
    const [applied, setApplied] = useState<AppliedClass[]>([])
    const [code, setCode] = useState("")
    const [notice, setNotice] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        try {
            const [c, l, a] = await Promise.all([apiGetClasses(), apiGetProfessorLinks(), apiGetAppliedClasses()])
            setClasses(c)
            setLinks(l)
            setApplied(a)
            setError(null)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao carregar turmas.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t) }, [load])

    async function join(e: React.FormEvent) {
        e.preventDefault()
        if (!code.trim()) return
        setBusy(true)
        setNotice(null)
        setError(null)
        try {
            const link = await apiJoinProfessor(code.trim())
            setNotice(`Você agora está vinculado ao professor ${link.professor.name}.`)
            setCode("")
            await load()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Código de turma inválido.")
        } finally {
            setBusy(false)
        }
    }

    async function leave(link: ProfessorLinkItem) {
        if (!window.confirm(`Desvincular-se de ${link.professor.name}? As turmas dele deixam de aparecer aqui; o que você já aplicou continua com você.`)) return
        setBusy(true)
        try {
            await apiLeaveProfessor(link.id)
            await load()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao desvincular.")
        } finally {
            setBusy(false)
        }
    }

    async function remove(item: AppliedClass, mode: "detach" | "delete") {
        const label = item.name ?? "esta turma"
        const ok = mode === "detach"
            ? window.confirm(`Desvincular "${label}"? Disciplina, tópicos, provas e tarefas continuam com você como dados próprios, sem novas atualizações da turma.`)
            : window.confirm(`Excluir "${label}"? Isso apaga a disciplina, seus tópicos, provas, cronogramas e as tarefas da turma. Suas próprias tarefas e notas não são afetadas. Não dá para desfazer.`)
        if (!ok) return
        setBusy(true)
        setNotice(null)
        try {
            await apiRemoveApplication(item.id, mode)
            setNotice(mode === "detach" ? "Turma desvinculada; seus dados foram mantidos." : "Turma excluída.")
            await load()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao remover a turma.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="space-y-6">
            <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
                <h1 className="page-title">Turmas</h1>
                <p className="text-xs text-muted-foreground">
                    Entre com o código do seu professor e aplique uma turma pronta: disciplina, tópicos e provas entram de uma vez e o cronograma é gerado para você.
                </p>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {notice && <Alert><AlertDescription>{notice}</AlertDescription></Alert>}

            <Card>
                <CardHeader className="px-4">
                    <CardTitle className="flex items-center gap-2 text-sm font-bold"><KeyRound className="h-4 w-4" />Entrar em uma turma</CardTitle>
                    <CardDescription className="text-xs">
                        Peça ao professor o código da turma (8 caracteres). Ao entrar, o professor passa a ver seu progresso de estudo
                        (retenção, adesão, prontidão para provas), os nomes das suas disciplinas, tópicos e provas e suas notas nas atividades.
                        Ele não vê o conteúdo das suas anotações nem dos seus flashcards.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-4">
                    <form onSubmit={join} className="flex flex-wrap gap-2">
                        <Input
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="AB12CD34"
                            maxLength={32}
                            aria-label="Código da turma"
                            className="h-9 w-48 font-mono uppercase"
                        />
                        <Button type="submit" disabled={busy || !code.trim()}>Vincular</Button>
                    </form>
                    {links.length > 0 && (
                        <ul className="divide-y divide-border/40">
                            {links.map((l) => (
                                <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                                    <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-muted-foreground" />{l.professor.name}</span>
                                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => leave(l)} className="gap-1 text-xs">
                                        <UserMinus className="h-3.5 w-3.5" />Desvincular
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h2 className="text-sm font-bold">Turmas disponíveis</h2>
                {loading ? (
                    <p className="text-xs text-muted-foreground">Carregando…</p>
                ) : classes.length === 0 ? (
                    <Card><EmptyState icon={<BookOpen />} message={links.length === 0 ? "Vincule-se a um professor para ver as turmas dele." : "Seus professores ainda não publicaram nenhuma turma."} /></Card>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {classes.map((c) => (
                            <Card key={c.id} className="gap-3">
                                <CardHeader className="px-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <CardTitle className="truncate text-sm font-bold">{c.name}</CardTitle>
                                            <CardDescription className="text-xs">Prof. {c.professor.name}</CardDescription>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {c.applied && <Badge variant="secondary" className="text-[10px]">Aplicada</Badge>}
                                            {c.update_available && <Badge className="text-[10px]">Atualização disponível</Badge>}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 px-4">
                                    {c.description && <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
                                    <p className="text-xs text-muted-foreground">
                                        {pluralize(c.topic_count, "tópico", "tópicos")}
                                        {" · "}
                                        {c.next_exam_date ? `próxima prova em ${formatDateSafe(c.next_exam_date)}` : "sem prova futura"}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Link href={`/classes/${c.id}`} className={cn(buttonVariants({ variant: c.applied ? "outline" : "default", size: "sm" }))}>
                                            {c.applied ? "Ver turma" : "Ver prévia e aplicar"}
                                        </Link>
                                        {c.update_available && c.application_id && (
                                            <Link href={`/classes/updates/${c.application_id}`} className={cn(buttonVariants({ size: "sm" }))}>Revisar atualização</Link>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {applied.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-bold">Minhas turmas aplicadas</h2>
                    <Card>
                        <CardContent className="divide-y divide-border/40 px-4">
                            {applied.map((a) => (
                                <div key={a.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                                            {a.name ?? "Turma"}
                                            {a.preset_status === "archived" && <Badge variant="outline" className="text-[10px]">{STATUS_LABEL.archived}</Badge>}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Prof. {a.professor.name} · versão {a.version_applied} · aplicada em {formatDateSafe(a.applied_at)}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {classes.some((c) => c.application_id === a.id && c.update_available) && (
                                            <Link href={`/classes/updates/${a.id}`} className={cn(buttonVariants({ size: "sm" }), "text-xs")}>Revisar atualização</Link>
                                        )}
                                        <Link href={`/subjects/${a.subject_id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1 text-xs")}>
                                            <BookOpen className="h-3.5 w-3.5" />Abrir disciplina
                                        </Link>
                                        <Button size="sm" variant="outline" disabled={busy} onClick={() => remove(a, "detach")} className="gap-1 text-xs">
                                            <Unlink className="h-3.5 w-3.5" />Manter meus dados
                                        </Button>
                                        <Button size="sm" variant="destructive" disabled={busy} onClick={() => remove(a, "delete")} className="gap-1 text-xs">
                                            <Trash2 className="h-3.5 w-3.5" />Excluir
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
        </section>
    )
}
