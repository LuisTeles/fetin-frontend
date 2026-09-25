"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Save, Send } from "lucide-react"

import { PresetEditor } from "@/components/presets/preset-editor"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
    apiGetPreset, apiPublishPreset, apiSavePresetContent, apiUpdatePreset, PresetApiError,
    STATUS_LABEL, type PresetContent, type PresetDetail,
} from "@/lib/api/presets"

export default function PresetEditorPage() {
    const { id } = useParams<{ id: string }>()
    const [preset, setPreset] = useState<PresetDetail | null>(null)
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [content, setContent] = useState<PresetContent>({ topics: [], assessments: [] })
    const [dirty, setDirty] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [problems, setProblems] = useState<string[]>([])
    const [notice, setNotice] = useState<string | null>(null)
    const loadedId = useRef<string | null>(null)

    function adopt(p: PresetDetail) {
        setPreset(p)
        setName(p.name)
        setDescription(p.description ?? "")
        setContent(p.content)
        setDirty(false)
    }

    useEffect(() => {
        if (loadedId.current === id) return
        loadedId.current = id
        apiGetPreset(id).then(adopt).catch((err: unknown) => setError(err instanceof Error ? err.message : "Preset não encontrado."))
    }, [id])

    const archived = preset?.status === "archived"

    /** Saves metadata and content; returns the fresh preset, or null after reporting the failure. */
    async function save(): Promise<PresetDetail | null> {
        if (!preset) return null
        setError(null)
        setProblems([])
        try {
            if (name.trim() !== preset.name || (description.trim() || null) !== preset.description) {
                await apiUpdatePreset(preset.id, { name: name.trim(), description: description.trim() })
            }
            const saved = await apiSavePresetContent(preset.id, content)
            adopt(saved)
            return saved
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao salvar.")
            if (err instanceof PresetApiError) setProblems(err.errors)
            return null
        }
    }

    async function onSave() {
        setBusy(true)
        setNotice(null)
        const saved = await save()
        if (saved) setNotice("Rascunho salvo. Os alunos só veem as mudanças depois de publicar.")
        setBusy(false)
    }

    async function onPublish() {
        setBusy(true)
        setNotice(null)
        const saved = await save()
        if (saved) {
            try {
                const res = await apiPublishPreset(saved.id)
                setNotice(`Publicado como versão ${res.version}. Alunos vinculados já podem aplicar.`)
                setPreset((cur) => (cur ? { ...cur, status: res.status, version: res.version } : cur))
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Erro ao publicar.")
                if (err instanceof PresetApiError) setProblems(err.errors)
            }
        }
        setBusy(false)
    }

    if (!preset) {
        return (
            <section className="space-y-4">
                <Link href="/presets" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}><ArrowLeft className="h-4 w-4" />Presets</Link>
                {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : <p className="text-xs text-muted-foreground">Carregando…</p>}
            </section>
        )
    }

    return (
        <section className="space-y-6">
            <Link href="/presets" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1")}><ArrowLeft className="h-4 w-4" />Presets</Link>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
                <div className="flex items-center gap-2">
                    <h1 className="page-title">{preset.name}</h1>
                    <Badge variant={preset.status === "published" ? "default" : "outline"}>{STATUS_LABEL[preset.status]}</Badge>
                    {preset.version > 0 && <span className="text-xs text-muted-foreground">v{preset.version}</span>}
                </div>
                {preset.version > 0 && (
                    <Link href={`/presets/${preset.id}/insights`} className={cn(buttonVariants({ variant: "outline" }))}>Progresso dos alunos</Link>
                )}
                {!archived && (
                    <div className="flex gap-2">
                        <Button variant="outline" disabled={busy || !dirty} onClick={onSave} className="gap-1"><Save />Salvar rascunho</Button>
                        <Button disabled={busy} onClick={onPublish} className="gap-1"><Send />{preset.version > 0 ? "Publicar nova versão" : "Publicar"}</Button>
                    </div>
                )}
            </div>

            {archived && <Alert><AlertDescription>Este preset está arquivado e não pode mais ser editado. Duplique-o para criar uma nova turma a partir dele.</AlertDescription></Alert>}
            {dirty && !archived && <p className="text-xs text-muted-foreground">Há alterações não salvas.</p>}
            {notice && <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>{notice}</AlertDescription></Alert>}
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>{error}</AlertTitle>
                    {problems.length > 0 && <AlertDescription><ul className="list-disc pl-4">{problems.map((p) => <li key={p}>{p}</li>)}</ul></AlertDescription>}
                </Alert>
            )}

            <Card>
                <CardHeader className="px-4"><CardTitle className="text-sm font-bold">Turma</CardTitle></CardHeader>
                <CardContent className="space-y-3 px-4">
                    <Input value={name} onChange={(e) => { setName(e.target.value); setDirty(true) }} aria-label="Nome da turma" disabled={archived} maxLength={120} className="h-9 max-w-md" />
                    <textarea
                        value={description}
                        onChange={(e) => { setDescription(e.target.value); setDirty(true) }}
                        aria-label="Descrição"
                        placeholder="Descrição (opcional)"
                        disabled={archived}
                        maxLength={2000}
                        rows={3}
                        className="w-full max-w-xl rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </CardContent>
            </Card>

            <PresetEditor value={content} onChange={(next) => { setContent(next); setDirty(true) }} disabled={archived} />
        </section>
    )
}
