"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, CornerDownRight, Plus, Trash2 } from "lucide-react"

import { flattenTopics } from "@/components/presets/topic-tree"
import { nativeSelectClass } from "@/components/flashcards/native-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    WEIGHT_LABEL,
    type AssessmentKind,
    type PresetAssessment,
    type PresetContent,
    type PresetTopic,
    type TopicWeight,
} from "@/lib/api/presets"

interface Props {
    value: PresetContent
    onChange: (next: PresetContent) => void
    disabled?: boolean
}

const uuid = () => crypto.randomUUID()

/** Every topic under `id` (children, grandchildren…), so a topic can never be re-parented into itself. */
function descendantsOf(topics: PresetTopic[], id: string): Set<string> {
    const out = new Set<string>()
    const walk = (parent: string) => {
        for (const t of topics) {
            if (t.parentId === parent && !out.has(t.id)) {
                out.add(t.id)
                walk(t.id)
            }
        }
    }
    walk(id)
    return out
}

/** Sibling order is `position`; renumber each sibling group 0..n so saves are always dense. */
export function normalizePositions(topics: PresetTopic[]): PresetTopic[] {
    const groups = new Map<string | null, PresetTopic[]>()
    for (const t of topics) {
        const list = groups.get(t.parentId) ?? []
        list.push(t)
        groups.set(t.parentId, list)
    }
    const next = new Map<string, number>()
    for (const list of groups.values()) {
        list.sort((a, b) => a.position - b.position).forEach((t, i) => next.set(t.id, i))
    }
    return topics.map((t) => ({ ...t, position: next.get(t.id) ?? t.position }))
}

export function PresetEditor({ value, onChange, disabled = false }: Props) {
    const { topics, assessments } = value
    const rows = useMemo(() => flattenTopics(topics), [topics])
    const [openPrereq, setOpenPrereq] = useState<string | null>(null)

    const setTopics = (next: PresetTopic[]) => onChange({ ...value, topics: normalizePositions(next) })
    const setAssessments = (next: PresetAssessment[]) => onChange({ ...value, assessments: next })

    function addTopic(parentId: string | null) {
        const siblings = topics.filter((t) => t.parentId === parentId)
        setTopics([
            ...topics,
            {
                id: uuid(), parentId, position: siblings.length, name: "", weight: "essential",
                estimatedHours: null, difficulty: null, prerequisiteIds: [],
            },
        ])
    }

    function patchTopic(id: string, patch: Partial<PresetTopic>) {
        setTopics(topics.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    }

    function removeTopic(id: string) {
        const gone = new Set([id, ...descendantsOf(topics, id)])
        const remaining = topics
            .filter((t) => !gone.has(t.id))
            .map((t) => ({ ...t, prerequisiteIds: t.prerequisiteIds.filter((p) => !gone.has(p)) }))
        onChange({
            topics: normalizePositions(remaining),
            assessments: assessments.map((a) => ({ ...a, topicIds: a.topicIds.filter((x) => !gone.has(x)) })),
        })
    }

    function move(id: string, dir: -1 | 1) {
        const me = topics.find((t) => t.id === id)
        if (!me) return
        const siblings = topics.filter((t) => t.parentId === me.parentId).sort((a, b) => a.position - b.position)
        const i = siblings.findIndex((t) => t.id === id)
        const other = siblings[i + dir]
        if (!other) return
        setTopics(topics.map((t) => (t.id === me.id ? { ...t, position: other.position } : t.id === other.id ? { ...t, position: me.position } : t)))
    }

    function addAssessment(kind: AssessmentKind) {
        setAssessments([...assessments, { id: uuid(), kind, title: "", date: "", topicIds: [] }])
    }

    function patchAssessment(id: string, patch: Partial<PresetAssessment>) {
        setAssessments(assessments.map((a) => (a.id === id ? { ...a, ...patch } : a)))
    }

    function toggle(list: string[], id: string): string[] {
        return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="px-4">
                    <CardTitle className="text-sm font-bold">Tópicos ({topics.length})</CardTitle>
                    <CardDescription className="text-xs">
                        O peso (essencial, revisão, opcional) é o que o cronograma usa. Horas, dificuldade e pré-requisitos aparecem para o aluno, mas ainda não alteram o cronograma.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 px-4">
                    {rows.length === 0 && <p className="text-xs text-muted-foreground">Nenhum tópico ainda.</p>}
                    {rows.map(({ topic: t, depth }, index) => {
                        const blocked = new Set([t.id, ...descendantsOf(topics, t.id)])
                        const siblings = topics.filter((x) => x.parentId === t.parentId).sort((a, b) => a.position - b.position)
                        const sibIndex = siblings.findIndex((x) => x.id === t.id)
                        return (
                            <div key={t.id} style={{ marginLeft: `${depth * 1.25}rem` }} className="space-y-2 rounded-lg border border-border/60 p-2.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Input
                                        value={t.name}
                                        onChange={(e) => patchTopic(t.id, { name: e.target.value })}
                                        placeholder="Nome do tópico"
                                        aria-label={`Nome do tópico ${index + 1}`}
                                        disabled={disabled}
                                        maxLength={200}
                                        className="h-8 min-w-48 flex-1"
                                    />
                                    <select
                                        value={t.weight}
                                        onChange={(e) => patchTopic(t.id, { weight: e.target.value as TopicWeight })}
                                        aria-label="Peso"
                                        disabled={disabled}
                                        className={nativeSelectClass}
                                    >
                                        {(Object.keys(WEIGHT_LABEL) as TopicWeight[]).map((w) => <option key={w} value={w}>{WEIGHT_LABEL[w]}</option>)}
                                    </select>
                                    <Input
                                        type="number" min={0} max={9999} step="0.5"
                                        value={t.estimatedHours ?? ""}
                                        onChange={(e) => patchTopic(t.id, { estimatedHours: e.target.value === "" ? null : Number(e.target.value) })}
                                        placeholder="horas"
                                        aria-label="Horas estimadas"
                                        disabled={disabled}
                                        className="h-8 w-20"
                                    />
                                    <select
                                        value={t.difficulty ?? ""}
                                        onChange={(e) => patchTopic(t.id, { difficulty: e.target.value === "" ? null : Number(e.target.value) })}
                                        aria-label="Dificuldade"
                                        disabled={disabled}
                                        className={nativeSelectClass}
                                    >
                                        <option value="">dificuldade</option>
                                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <label className="flex items-center gap-1 text-muted-foreground">
                                        Dentro de
                                        <select
                                            value={t.parentId ?? ""}
                                            onChange={(e) => patchTopic(t.id, { parentId: e.target.value || null, position: 9999 })}
                                            disabled={disabled}
                                            className={nativeSelectClass}
                                        >
                                            <option value="">(raiz)</option>
                                            {topics.filter((x) => !blocked.has(x.id)).map((x) => <option key={x.id} value={x.id}>{x.name || "(sem nome)"}</option>)}
                                        </select>
                                    </label>
                                    <Button type="button" size="xs" variant="ghost" disabled={disabled} onClick={() => setOpenPrereq(openPrereq === t.id ? null : t.id)}>
                                        Pré-requisitos ({t.prerequisiteIds.length})
                                    </Button>
                                    <Button type="button" size="icon-xs" variant="ghost" disabled={disabled || sibIndex === 0} onClick={() => move(t.id, -1)} aria-label="Mover para cima"><ArrowUp /></Button>
                                    <Button type="button" size="icon-xs" variant="ghost" disabled={disabled || sibIndex === siblings.length - 1} onClick={() => move(t.id, 1)} aria-label="Mover para baixo"><ArrowDown /></Button>
                                    <Button type="button" size="xs" variant="ghost" disabled={disabled} onClick={() => addTopic(t.id)} className="gap-1"><CornerDownRight />Subtópico</Button>
                                    <Button type="button" size="xs" variant="destructive" disabled={disabled} onClick={() => removeTopic(t.id)} className="gap-1"><Trash2 />Remover</Button>
                                </div>
                                {openPrereq === t.id && (
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-md bg-muted/40 p-2 text-xs">
                                        {topics.filter((x) => x.id !== t.id).length === 0 && <span className="text-muted-foreground">Não há outros tópicos.</span>}
                                        {topics.filter((x) => x.id !== t.id).map((x) => (
                                            <label key={x.id} className="flex items-center gap-1.5">
                                                <input
                                                    type="checkbox"
                                                    checked={t.prerequisiteIds.includes(x.id)}
                                                    disabled={disabled}
                                                    onChange={() => patchTopic(t.id, { prerequisiteIds: toggle(t.prerequisiteIds, x.id) })}
                                                />
                                                {x.name || "(sem nome)"}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => addTopic(null)} className="gap-1"><Plus />Adicionar tópico</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="px-4">
                    <CardTitle className="text-sm font-bold">Provas e tarefas ({assessments.length})</CardTitle>
                    <CardDescription className="text-xs">
                        Provas viram provas na conta do aluno (duas provas do mesmo preset não podem cair no mesmo dia). Tarefas viram tarefas avulsas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 px-4">
                    {assessments.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma avaliação ainda.</p>}
                    {assessments.map((a, i) => (
                        <div key={a.id} className="space-y-2 rounded-lg border border-border/60 p-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={a.kind}
                                    onChange={(e) => {
                                        const kind = e.target.value as AssessmentKind
                                        patchAssessment(a.id, { kind, topicIds: kind === "assignment" ? [] : a.topicIds })
                                    }}
                                    aria-label="Tipo"
                                    disabled={disabled}
                                    className={nativeSelectClass}
                                >
                                    <option value="exam">Prova</option>
                                    <option value="assignment">Tarefa</option>
                                </select>
                                <Input
                                    value={a.title}
                                    onChange={(e) => patchAssessment(a.id, { title: e.target.value })}
                                    placeholder="Título (ex.: Prova 1)"
                                    aria-label={`Título da avaliação ${i + 1}`}
                                    disabled={disabled}
                                    maxLength={200}
                                    className="h-8 min-w-48 flex-1"
                                />
                                <Input
                                    type="date"
                                    value={a.date}
                                    onChange={(e) => patchAssessment(a.id, { date: e.target.value })}
                                    aria-label="Data"
                                    disabled={disabled}
                                    className="h-8 w-40"
                                />
                                <Button type="button" size="xs" variant="destructive" disabled={disabled} onClick={() => setAssessments(assessments.filter((x) => x.id !== a.id))} className="gap-1"><Trash2 />Remover</Button>
                            </div>
                            {a.kind === "exam" && (
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                    <span className="text-muted-foreground">Cobre:</span>
                                    {topics.length === 0 && <span className="text-muted-foreground">adicione tópicos primeiro</span>}
                                    {topics.map((t) => (
                                        <label key={t.id} className="flex items-center gap-1.5">
                                            <input
                                                type="checkbox"
                                                checked={a.topicIds.includes(t.id)}
                                                disabled={disabled}
                                                onChange={() => patchAssessment(a.id, { topicIds: toggle(a.topicIds, t.id) })}
                                            />
                                            {t.name || "(sem nome)"}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => addAssessment("exam")} className="gap-1"><Plus />Prova</Button>
                        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => addAssessment("assignment")} className="gap-1"><Plus />Tarefa</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
