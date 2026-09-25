import { Badge } from "@/components/ui/badge"
import { formatDateSafe } from "@/lib/format"
import { WEIGHT_LABEL, type PresetAssessment, type PresetTopic } from "@/lib/api/presets"

/** Parents before children, siblings by position, with the nesting depth of each row. */
export function flattenTopics(topics: PresetTopic[]): { topic: PresetTopic; depth: number }[] {
    const byParent = new Map<string | null, PresetTopic[]>()
    for (const t of topics) {
        const list = byParent.get(t.parentId) ?? []
        list.push(t)
        byParent.set(t.parentId, list)
    }
    const out: { topic: PresetTopic; depth: number }[] = []
    const walk = (parent: string | null, depth: number) => {
        for (const t of [...(byParent.get(parent) ?? [])].sort((a, b) => a.position - b.position)) {
            out.push({ topic: t, depth })
            walk(t.id, depth + 1)
        }
    }
    walk(null, 0)
    return out
}

/** Read-only topic tree used by the student preview. */
export function TopicTree({ topics }: { topics: PresetTopic[] }) {
    const rows = flattenTopics(topics)
    const nameOf = new Map(topics.map((t) => [t.id, t.name]))
    if (rows.length === 0) return <p className="text-xs text-muted-foreground">Nenhum tópico.</p>
    return (
        <ul className="space-y-1.5">
            {rows.map(({ topic, depth }) => (
                <li key={topic.id} style={{ paddingLeft: `${depth * 1.25}rem` }} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-medium">{topic.name}</span>
                    <Badge variant={topic.weight === "essential" ? "default" : "outline"} className="text-[10px]">
                        {WEIGHT_LABEL[topic.weight]}
                    </Badge>
                    {topic.estimatedHours !== null && <span className="text-xs text-muted-foreground">{topic.estimatedHours} h</span>}
                    {topic.difficulty !== null && <span className="text-xs text-muted-foreground">dificuldade {topic.difficulty}/5</span>}
                    {topic.prerequisiteIds.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                            requer: {topic.prerequisiteIds.map((id) => nameOf.get(id) ?? "?").join(", ")}
                        </span>
                    )}
                </li>
            ))}
        </ul>
    )
}

/** Read-only exams/assignments list, exams first, by date. */
export function AssessmentList({ assessments, topics }: { assessments: PresetAssessment[]; topics: PresetTopic[] }) {
    const nameOf = new Map(topics.map((t) => [t.id, t.name]))
    if (assessments.length === 0) return <p className="text-xs text-muted-foreground">Nenhuma avaliação.</p>
    const sorted = [...assessments].sort((a, b) => a.date.localeCompare(b.date))
    return (
        <ul className="space-y-1.5">
            {sorted.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <Badge variant={a.kind === "exam" ? "default" : "secondary"} className="text-[10px]">
                        {a.kind === "exam" ? "Prova" : "Tarefa"}
                    </Badge>
                    <span className="font-medium">{a.title}</span>
                    <span className="text-xs text-muted-foreground">{formatDateSafe(a.date)}</span>
                    {a.topicIds.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                            cobre: {a.topicIds.map((id) => nameOf.get(id) ?? "?").join(", ")}
                        </span>
                    )}
                </li>
            ))}
        </ul>
    )
}
