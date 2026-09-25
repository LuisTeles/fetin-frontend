"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, TriangleAlert } from "lucide-react"

import { nativeSelectClass } from "@/components/flashcards/native-select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateSafe } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
    apiGetAppliedClasses, apiGetClassPreview, apiGetPresetDiff, apiMergePreset, PresetApiError, WEIGHT_LABEL,
    type EntityDiff, type FieldChange, type FieldValue, type MergeResult, type PresetDiff, type TopicWeight,
} from "@/lib/api/presets"

const FIELD_LABEL: Record<string, string> = {
    name: "Nome",
    weight: "Peso",
    estimatedHours: "Horas estimadas",
    difficulty: "Dificuldade",
    parent: "Tópico pai",
    title: "Título",
    date: "Data",
    topics: "Tópicos cobertos",
}

type Choices = Record<string, Record<string, "theirs" | "mine">>

interface SectionProps {
    title: string
    kind: "topics" | "exams" | "tasks"
    d: EntityDiff
    accept: Set<string>
    remove: Set<string>
    choices: Choices
    fmt: (field: string, v: FieldValue) => string
    onAccept: (key: string) => void
    onRemove: (key: string) => void
    onChoice: (key: string, field: string, value: "theirs" | "mine") => void
}

function Section({ title, kind, d, accept, remove, choices, fmt, onAccept, onRemove, onChoice }: SectionProps) {
        if (d.added.length + d.removed.length + d.changed.length === 0) return null
        return (
            <Card>
                <CardHeader className="px-4"><CardTitle className="text-sm font-bold">{title}</CardTitle></CardHeader>
                <CardContent className="space-y-4 px-4">
                    {d.added.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground">Novos</p>
                            {d.added.map((a) => (
                                <label key={a.key} className="flex items-start gap-2 text-sm">
                                    <input type="checkbox" className="mt-1" checked={accept.has(a.key)} onChange={() => onAccept(a.key)} />
                                    <span>
                                        <span className="font-medium">{a.label}</span>
                                        {kind !== "topics" && typeof a.fields.date === "string" && <span className="text-xs text-muted-foreground"> · {formatDateSafe(a.fields.date)}</span>}
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                    {d.changed.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">Alterados</p>
                            {d.changed.map((item) => (
                                <div key={item.key} className="space-y-1.5 rounded-lg border border-border/60 p-2.5">
                                    <p className="text-sm font-medium">{item.label}</p>
                                    {item.fields.map((f: FieldChange) => (
                                        <div key={f.field} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                            <span className="w-32 font-medium">{FIELD_LABEL[f.field] ?? f.field}</span>
                                            <span className="text-muted-foreground">professor: <span className="text-foreground">{fmt(f.field, f.base)} → {fmt(f.field, f.theirs)}</span></span>
                                            {f.resolution === "conflict" && <Badge variant="destructive" className="text-[10px]">você também mudou: {fmt(f.field, f.mine)}</Badge>}
                                            <select
                                                aria-label={`${FIELD_LABEL[f.field] ?? f.field} de ${item.label}`}
                                                value={choices[item.key]?.[f.field] ?? "mine"}
                                                onChange={(e) => onChoice(item.key, f.field, e.target.value as "theirs" | "mine")}
                                                className={nativeSelectClass}
                                            >
                                                <option value="theirs">Usar a do professor</option>
                                                <option value="mine">Manter a minha</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                    {d.removed.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground">Removidos pelo professor</p>
                            {d.removed.map((x) => (
                                <label key={x.key} className="flex items-start gap-2 text-sm">
                                    <input type="checkbox" className="mt-1" checked={remove.has(x.key)} onChange={() => onRemove(x.key)} />
                                    <span>
                                        Excluir <span className="font-medium">{x.label}</span>
                                        <span className="text-xs text-muted-foreground"> — desmarcado, ele fica com você como item próprio</span>
                                        {x.has_progress && <Badge variant="destructive" className="ml-2 text-[10px]">você tem progresso aqui</Badge>}
                                        {kind === "topics" && remove.has(x.key) && <span className="block text-xs text-muted-foreground">Excluir apaga também os flashcards, sessões e revisões deste tópico.</span>}
                                        {kind === "exams" && remove.has(x.key) && <span className="block text-xs text-muted-foreground">Excluir apaga também os cronogramas desta prova.</span>}
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        )
    }

export default function ClassUpdatePage() {
    const { applicationId } = useParams<{ applicationId: string }>()
    const [diff, setDiff] = useState<PresetDiff | null>(null)
    const [names, setNames] = useState<Map<string, string>>(new Map())
    const [accept, setAccept] = useState<Set<string>>(new Set())
    const [remove, setRemove] = useState<Set<string>>(new Set())
    const [choices, setChoices] = useState<Choices>({})
    const [result, setResult] = useState<MergeResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [reloadKey, setReloadKey] = useState(0)

    // Reloading after a stale-version conflict re-runs this effect with a fresh diff.
    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const d = await apiGetPresetDiff(applicationId)
                if (cancelled) return
                setDiff(d)
                setAccept(new Set([...d.topics.added, ...d.exams.added, ...d.tasks.added].map((a) => a.key)))
                setRemove(new Set())
                const defaults: Choices = {}
                for (const list of [d.topics.changed, d.exams.changed, d.tasks.changed]) {
                    for (const item of list) {
                        defaults[item.key] = Object.fromEntries(item.fields.map((f) => [f.field, f.resolution === "auto" ? "theirs" : "mine"]))
                    }
                }
                setChoices(defaults)

                // Names for the parent / covered-topics fields come from the class preview.
                const applied = (await apiGetAppliedClasses()).find((a) => a.id === applicationId)
                const map = new Map<string, string>()
                for (const list of [d.topics.added, d.topics.removed, d.topics.changed]) for (const x of list) map.set(x.key, x.label)
                if (applied) {
                    const preview = await apiGetClassPreview(applied.preset_id).catch(() => null)
                    for (const t of preview?.topics ?? []) map.set(t.id, t.name)
                }
                if (!cancelled) setNames(map)
            } catch (err: unknown) {
                if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar as mudanças.")
            }
        }
        void load()
        return () => { cancelled = true }
    }, [applicationId, reloadKey])

    const fmt = useMemo(() => (field: string, v: FieldValue): string => {
        if (v === null || v === undefined) return field === "parent" ? "(raiz)" : "—"
        if (field === "weight") return WEIGHT_LABEL[v as TopicWeight] ?? String(v)
        if (field === "date") return formatDateSafe(v as string)
        if (field === "parent") return String(v).startsWith("~own:") ? "um tópico seu" : (names.get(v as string) ?? "outro tópico")
        if (field === "topics") return (v as string[]).length === 0 ? "nenhum" : (v as string[]).map((k) => names.get(k) ?? "?").join(", ")
        if (field === "estimatedHours") return `${v} h`
        if (field === "difficulty") return `${v}/5`
        return String(v)
    }, [names])

    function toggle(set: Set<string>, key: string): Set<string> {
        const next = new Set(set)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
    }

    async function apply() {
        if (!diff) return
        setBusy(true)
        setError(null)
        try {
            setResult(await apiMergePreset(applicationId, {
                toVersion: diff.to_version,
                acceptAdded: [...accept],
                remove: [...remove],
                fieldChoices: choices,
            }))
        } catch (err: unknown) {
            if (err instanceof PresetApiError && err.code === "STALE_VERSION") {
                setError("O professor publicou uma versão ainda mais nova enquanto você revisava. Recarregamos as mudanças; revise de novo.")
                setReloadKey((k) => k + 1)
            } else if (err instanceof PresetApiError && err.code === "UP_TO_DATE") {
                setError("Esta turma já está na versão mais recente.")
            } else {
                setError(err instanceof Error ? err.message : "Erro ao aplicar a atualização.")
            }
        } finally {
            setBusy(false)
        }
    }

    const back = <Link href="/classes" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}><ArrowLeft className="h-4 w-4" />Turmas</Link>

    if (result) {
        const c = result.created, u = result.updated, r = result.removed, k = result.kept
        return (
            <section className="space-y-4">
                {back}
                <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Atualizado da versão {result.from_version} para a {result.to_version}</AlertTitle>
                    <AlertDescription>
                        Criados: {c.topics} tópicos, {c.exams} provas, {c.tasks} tarefas · atualizados: {u.topics} tópicos, {u.exams} provas, {u.tasks} tarefas · excluídos: {r.topics + r.exams + r.tasks} · mantidos como seus: {k.topics + k.exams + k.tasks}.
                    </AlertDescription>
                </Alert>
                {result.skipped.length > 0 && (
                    <Alert>
                        <TriangleAlert className="h-4 w-4" />
                        <AlertTitle>Não aplicado</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc pl-4">{result.skipped.map((s, i) => <li key={i}>{s.title}: {s.reason}</li>)}</ul>
                        </AlertDescription>
                    </Alert>
                )}
                {result.schedules.some((s) => !s.generated) && (
                    <p className="text-xs text-muted-foreground">Algumas provas novas ficaram sem cronograma: {result.schedules.filter((s) => !s.generated).map((s) => s.reason).join("; ")}</p>
                )}
                <p className="text-xs text-muted-foreground">Cronogramas existentes cujas provas mudaram aparecem como desatualizados em Calendário Automático.</p>
                <Link href="/classes" className={buttonVariants()}>Voltar às turmas</Link>
            </section>
        )
    }

    if (!diff) {
        return (
            <section className="space-y-4">
                {back}
                {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : <p className="text-xs text-muted-foreground">Carregando…</p>}
            </section>
        )
    }

    if (diff.up_to_date) {
        return (
            <section className="space-y-4">
                {back}
                <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>Esta turma já está na versão mais recente ({diff.to_version}).</AlertDescription></Alert>
            </section>
        )
    }

    return (
        <section className="space-y-6">
            {back}
            <div className="space-y-1 border-b border-border/40 pb-4">
                <h1 className="page-title">Atualização da turma</h1>
                <p className="text-xs text-muted-foreground">Versão {diff.from_version} → {diff.to_version}: {diff.counts.added} novos, {diff.counts.changed} alterados, {diff.counts.removed} removidos pelo professor.</p>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <Card>
                <CardHeader className="px-4"><CardDescription className="text-xs">
                    Você decide o que entra. Onde só o professor mudou, a mudança dele vem marcada por padrão; onde você também mudou, o padrão é manter a sua. Itens que você apagou não voltam.
                </CardDescription></CardHeader>
            </Card>

            <Section title="Tópicos" kind="topics" d={diff.topics} accept={accept} remove={remove} choices={choices} fmt={fmt} onAccept={(k) => setAccept((x) => toggle(x, k))} onRemove={(k) => setRemove((x) => toggle(x, k))} onChoice={(k, f, v) => setChoices((c) => ({ ...c, [k]: { ...c[k], [f]: v } }))} />
            <Section title="Provas" kind="exams" d={diff.exams} accept={accept} remove={remove} choices={choices} fmt={fmt} onAccept={(k) => setAccept((x) => toggle(x, k))} onRemove={(k) => setRemove((x) => toggle(x, k))} onChoice={(k, f, v) => setChoices((c) => ({ ...c, [k]: { ...c[k], [f]: v } }))} />
            <Section title="Tarefas" kind="tasks" d={diff.tasks} accept={accept} remove={remove} choices={choices} fmt={fmt} onAccept={(k) => setAccept((x) => toggle(x, k))} onRemove={(k) => setRemove((x) => toggle(x, k))} onChoice={(k, f, v) => setChoices((c) => ({ ...c, [k]: { ...c[k], [f]: v } }))} />

            <div className="flex gap-2">
                <Button onClick={apply} disabled={busy}>{busy ? "Aplicando…" : "Aplicar atualização"}</Button>
                <Link href="/classes" className={buttonVariants({ variant: "ghost" })}>Agora não</Link>
            </div>
        </section>
    )
}
