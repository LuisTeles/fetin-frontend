"use client"

import { useEffect, useState } from "react"
import { Layers, Loader2, Tag as TagIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TagSelectorDropdown } from "@/components/notes/tag-selector-dropdown"
import { MarkdownField } from "@/components/flashcards/markdown-field"
import { nativeSelectClass } from "@/components/flashcards/native-select"
import { apiGetAllTopics, apiGetExams, apiGetSubjects, formatExamLabel, type ExamEntity, type SubjectEntity, type TopicEntity } from "@/lib/api/entities"
import type { Tag } from "@/lib/api/notes"
import { apiCreateFlashcard, apiUpdateFlashcard, type Flashcard } from "@/lib/api/flashcards"
import { cn } from "@/lib/utils"

const SELECT = cn(nativeSelectClass, "w-full")

interface FlashcardFormProps {
    card?: Flashcard
    tags: Tag[]
    defaults?: { topicId?: string; examId?: string; back?: string }
    onSuccess: (card: Flashcard) => void
    onCancel?: () => void
}

export function FlashcardForm({ card, tags, defaults, onSuccess, onCancel }: FlashcardFormProps) {
    const isEdit = !!card
    const [front, setFront] = useState(card?.front ?? "")
    const [back, setBack] = useState(card?.back ?? defaults?.back ?? "")
    const [topicId, setTopicId] = useState(card?.topicId ?? defaults?.topicId ?? "")
    const [examId, setExamId] = useState(card?.examId ?? defaults?.examId ?? "")
    const [tagIds, setTagIds] = useState<string[]>(card?.tags.map((t) => t.tagId) ?? [])
    const [subjects, setSubjects] = useState<SubjectEntity[]>([])
    const [topics, setTopics] = useState<TopicEntity[]>([])
    const [exams, setExams] = useState<ExamEntity[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([apiGetSubjects(), apiGetAllTopics(), apiGetExams()])
            .then(([s, t, e]) => { setSubjects(s); setTopics(t); setExams(e) })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao carregar tópicos."))
    }, [])

    const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? ""
    const canSave = front.trim() && back.trim() && topicId && !isLoading

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!canSave) return
        setIsLoading(true)
        setError(null)
        try {
            const saved = isEdit
                ? await apiUpdateFlashcard(card!.id, { front, back, topicId, examId: examId || null, tagIds })
                : await apiCreateFlashcard({ front, back, topicId, examId: examId || undefined, tagIds })
            onSuccess(saved)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao salvar flashcard.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
                <Alert variant="destructive">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
            )}

            <MarkdownField id="flashcard-front" label="Frente" value={front} onChange={setFront} disabled={isLoading}
                placeholder="Pergunta, termo ou enunciado… (use @ para mencionar)" rows={4} />
            <MarkdownField id="flashcard-back" label="Verso" value={back} onChange={setBack} disabled={isLoading}
                placeholder="Resposta…" rows={5} />

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                    <Label htmlFor="flashcard-topic" className="text-xs text-muted-foreground">Tópico *</Label>
                    <select id="flashcard-topic" required value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={isLoading} className={SELECT}>
                        <option value="">Selecione um tópico</option>
                        {topics.map((t) => (
                            <option key={t.id} value={t.id}>{subjectName(t.subjectId) ? `${subjectName(t.subjectId)} · ${t.name}` : t.name}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="flashcard-exam" className="text-xs text-muted-foreground">Prova (opcional)</Label>
                    <select id="flashcard-exam" value={examId} onChange={(e) => setExamId(e.target.value)} disabled={isLoading} className={SELECT}>
                        <option value="">Nenhuma</option>
                        {exams.map((ex) => <option key={ex.id} value={ex.id}>{formatExamLabel(ex)}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-xs text-muted-foreground"><TagIcon className="h-3 w-3" />Tags</Label>
                <TagSelectorDropdown tags={tags} selectedIds={tagIds} onChange={setTagIds} disabled={isLoading} />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                {onCancel && (
                    <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isLoading} className="cursor-pointer">Cancelar</Button>
                )}
                <Button type="submit" size="sm" disabled={!canSave} className="cursor-pointer">
                    {isLoading ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Salvando…</>
                        : isEdit ? "Salvar Alterações" : <><Layers className="mr-1.5 h-3.5 w-3.5" />Criar Flashcard</>}
                </Button>
            </div>
        </form>
    )
}
