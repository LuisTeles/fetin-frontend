"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, TriangleAlert } from "lucide-react"

import { AssessmentList, TopicTree } from "@/components/presets/topic-tree"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { apiApplyClass, apiGetClassPreview, PresetApiError, type ApplyResult, type ClassPreview } from "@/lib/api/presets"

export default function ClassPreviewPage() {
    const { id } = useParams<{ id: string }>()
    const [preview, setPreview] = useState<ClassPreview | null>(null)
    const [subjectName, setSubjectName] = useState("")
    const [needsRename, setNeedsRename] = useState(false)
    const [result, setResult] = useState<ApplyResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        apiGetClassPreview(id)
            .then((p) => {
                setPreview(p)
                setNeedsRename(p.name_taken)
                setSubjectName(p.name_taken ? `${p.name} (${p.professor.name})` : p.name)
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Turma não encontrada."))
    }, [id])

    async function apply() {
        if (!preview) return
        setBusy(true)
        setError(null)
        try {
            const renamed = needsRename || subjectName.trim() !== preview.name
            setResult(await apiApplyClass(preview.id, renamed ? subjectName.trim() : undefined))
        } catch (err: unknown) {
            if (err instanceof PresetApiError && err.code === "NAME_TAKEN") {
                setNeedsRename(true)
                setSubjectName((cur) => (cur.trim() === preview.name ? `${preview.name} (${preview.professor.name})` : cur))
                setError("Você já tem uma disciplina com esse nome. Escolha outro nome para a turma.")
            } else if (err instanceof PresetApiError && err.code === "ALREADY_APPLIED") {
                setError("Você já aplicou esta turma. Veja-a em Turmas › Minhas turmas aplicadas.")
            } else {
                setError(err instanceof Error ? err.message : "Erro ao aplicar a turma.")
            }
        } finally {
            setBusy(false)
        }
    }

    if (!preview) {
        return (
            <section className="space-y-4">
                <Link href="/classes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}><ArrowLeft className="h-4 w-4" />Turmas</Link>
                {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : <p className="text-xs text-muted-foreground">Carregando…</p>}
            </section>
        )
    }

    if (result) {
        const notGenerated = result.schedules.filter((s) => !s.generated)
        return (
            <section className="space-y-4">
                <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Turma aplicada: {result.subject.name}</AlertTitle>
                    <AlertDescription>
                        {result.created.topics} tópicos, {result.created.exams} provas e {result.created.tasks} tarefas foram criados.
                    </AlertDescription>
                </Alert>
                {result.schedules.length > 0 && (
                    <Card>
                        <CardHeader className="px-4"><CardTitle className="text-sm font-bold">Cronograma</CardTitle></CardHeader>
                        <CardContent className="space-y-1 px-4 text-sm">
                            <p>{result.schedules.filter((s) => s.generated).length} de {result.schedules.length} cronogramas gerados automaticamente.</p>
                            {notGenerated.map((s) => (
                                <p key={s.exam_id} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />Não foi possível gerar um cronograma: {s.reason}
                                </p>
                            ))}
                        </CardContent>
                    </Card>
                )}
                {result.skipped.length > 0 && (
                    <Alert>
                        <TriangleAlert className="h-4 w-4" />
                        <AlertTitle>Itens ignorados</AlertTitle>
                        <AlertDescription>
                            {result.skipped.map((s) => `${s.kind === "exam" ? "Prova" : "Tarefa"} "${s.title}" (${s.reason})`).join("; ")}.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="flex flex-wrap gap-2">
                    <Link href={`/subjects/${result.subject.id}`} className={buttonVariants()}>Abrir disciplina</Link>
                    <Link href="/auto-schedule" className={buttonVariants({ variant: "outline" })}>Ver cronogramas</Link>
                    <Link href="/classes" className={buttonVariants({ variant: "ghost" })}>Voltar às turmas</Link>
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-6">
            <Link href="/classes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}><ArrowLeft className="h-4 w-4" />Turmas</Link>

            <div className="space-y-1 border-b border-border/40 pb-4">
                <h1 className="page-title">{preview.name}</h1>
                <p className="text-xs text-muted-foreground">Prof. {preview.professor.name} · versão {preview.version}</p>
                {preview.description && <p className="pt-1 text-sm text-muted-foreground">{preview.description}</p>}
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader className="px-4"><CardTitle className="text-sm font-bold">Tópicos ({preview.topics.length})</CardTitle></CardHeader>
                    <CardContent className="px-4"><TopicTree topics={preview.topics} /></CardContent>
                </Card>
                <Card>
                    <CardHeader className="px-4"><CardTitle className="text-sm font-bold">Provas e tarefas ({preview.assessments.length})</CardTitle></CardHeader>
                    <CardContent className="px-4"><AssessmentList assessments={preview.assessments} topics={preview.topics} /></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="px-4">
                    <CardTitle className="text-sm font-bold">Aplicar esta turma</CardTitle>
                    <CardDescription className="text-xs">
                        Cria a disciplina, os tópicos, as provas futuras e as tarefas na sua conta e gera o cronograma. Itens com data no passado são ignorados.
                        As horas, a dificuldade e os pré-requisitos são informativos: o cronograma usa o peso dos tópicos e as datas das provas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-4">
                    {preview.applied ? (
                        <p className="text-sm text-muted-foreground">Você já aplicou esta turma. Gerencie-a em <Link href="/classes" className="underline">Turmas</Link>.</p>
                    ) : (
                        <>
                            {needsRename && (
                                <div className="space-y-1">
                                    <label htmlFor="subject-name" className="text-xs font-medium">Você já tem uma disciplina chamada &quot;{preview.name}&quot;. Nome da nova disciplina:</label>
                                    <Input id="subject-name" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} maxLength={120} className="h-9 max-w-md" />
                                </div>
                            )}
                            <Button onClick={apply} disabled={busy || (needsRename && !subjectName.trim())}>{busy ? "Aplicando…" : "Aplicar turma"}</Button>
                        </>
                    )}
                </CardContent>
            </Card>
        </section>
    )
}
