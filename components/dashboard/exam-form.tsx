"use client"

import { FormEvent, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Plus, Check, Loader2 } from "lucide-react"

type Subject = {
    id: string
    name: string
}

type Topic = {
    id: string
    name: string
    weight: "essential" | "review" | "optional"
    is_completed: boolean
}

type Exam = {
    id: string
    subject_id: string
    subject_name: string
    exam_date: string
    topics: { id: string; name: string; is_completed: boolean }[]
}

type ExamFormProps = {
    exam?: Exam
    onSuccess: () => void
    onCancel?: () => void
}

export function ExamForm({ exam, onSuccess, onCancel }: ExamFormProps) {
    const isEdit = !!exam

    const [subjects, setSubjects] = useState<Subject[]>([])
    const [selectedSubjectId, setSelectedSubjectId] = useState(exam?.subject_id ?? "")
    const [examDate, setExamDate] = useState(exam?.exam_date ?? "")
    
    // Topics logic
    const [topics, setTopics] = useState<Topic[]>([])
    const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(
        exam?.topics.map((t) => t.id) ?? []
    )
    const [isFetchingTopics, setIsFetchingTopics] = useState(false)

    // Inline Topic Quick-Creation
    const [newTopicName, setNewTopicName] = useState("")
    const [newTopicWeight, setNewTopicWeight] = useState<"essential" | "review" | "optional">("essential")
    const [isCreatingTopic, setIsCreatingTopic] = useState(false)
    const [topicError, setTopicError] = useState<string | null>(null)

    // Global Form States
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isFetchingSubjects, setIsFetchingSubjects] = useState(true)

    // Calculate tomorrow's date for date picker min constraint
    const getTomorrowStr = () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow.toISOString().split("T")[0]
    }

    // Load subjects
    useEffect(() => {
        async function fetchSubjects() {
            setIsFetchingSubjects(true)
            try {
                const res = await fetch("/api/subjects")
                const data = await res.json()
                if (res.ok) {
                    setSubjects(data.subjects ?? [])
                } else {
                    setError("Não foi possível carregar as disciplinas.")
                }
            } catch (err) {
                setError("Erro de conexão ao buscar disciplinas.")
            } finally {
                setIsFetchingSubjects(false)
            }
        }
        fetchSubjects()
    }, [])

    // Load topics when subjectId changes
    useEffect(() => {
        if (!selectedSubjectId) {
            setTopics([])
            return
        }

        async function fetchTopics() {
            setIsFetchingTopics(true)
            setTopicError(null)
            try {
                const res = await fetch(`/api/topics?subjectId=${selectedSubjectId}`)
                const data = await res.json()
                if (res.ok) {
                    setTopics(data.topics ?? [])
                } else {
                    setTopicError("Não foi possível carregar os tópicos.")
                }
            } catch (err) {
                setTopicError("Erro de conexão ao buscar tópicos.")
            } finally {
                setIsFetchingTopics(false)
            }
        }

        fetchTopics()
    }, [selectedSubjectId])

    // Toggle topic selection
    const handleTopicToggle = (topicId: string) => {
        setSelectedTopicIds((prev) =>
            prev.includes(topicId)
                ? prev.filter((id) => id !== topicId)
                : [...prev, topicId]
        )
    }

    // Inline topic submission
    const handleQuickTopicSubmit = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (!newTopicName.trim()) {
            setTopicError("Nome do tópico é obrigatório.")
            return
        }
        if (!selectedSubjectId) {
            setTopicError("Selecione uma disciplina primeiro.")
            return
        }

        setIsCreatingTopic(true)
        setTopicError(null)

        try {
            const res = await fetch("/api/topics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subjectId: selectedSubjectId,
                    name: newTopicName.trim(),
                    weight: newTopicWeight,
                }),
            })
            const data = await res.json()

            if (res.ok) {
                const createdTopic = data.topic
                setTopics((prev) => [...prev, {
                    id: createdTopic.id,
                    name: createdTopic.name,
                    weight: createdTopic.weight,
                    is_completed: createdTopic.is_completed ?? false,
                }])
                // Auto-select newly created topic
                setSelectedTopicIds((prev) => [...prev, createdTopic.id])
                setNewTopicName("")
                setNewTopicWeight("essential")
            } else {
                setTopicError(data.message ?? "Erro ao criar tópico.")
            }
        } catch (err) {
            setTopicError("Erro ao conectar ao servidor para criar o tópico.")
        } finally {
            setIsCreatingTopic(false)
        }
    }

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        if (!selectedSubjectId) {
            setError("Selecione uma disciplina.")
            setIsLoading(false)
            return
        }

        if (!examDate) {
            setError("A data da prova é obrigatória.")
            setIsLoading(false)
            return
        }

        const url = isEdit ? `/api/exams/${exam.id}` : "/api/exams"
        const method = isEdit ? "PATCH" : "POST"

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subjectId: selectedSubjectId,
                    examDate,
                    topicIds: selectedTopicIds,
                }),
            })

            const payload = await response.json().catch(() => ({}))

            if (!response.ok) {
                setError(payload.message ?? "Não foi possível salvar a prova.")
                setIsLoading(false)
                return
            }

            onSuccess()
        } catch (err) {
            setError("Erro de rede. Verifique sua conexão.")
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border/80 bg-card p-4 shadow-sm transition-all duration-200">
            <h3 className="text-sm font-semibold text-foreground">
                {isEdit ? "Editar Prova" : "Nova Prova"}
            </h3>

            {/* Subject Select */}
            <div className="space-y-1.5">
                <Label htmlFor="exam-subject">Disciplina</Label>
                {isFetchingSubjects ? (
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Carregando disciplinas...
                    </div>
                ) : (
                    <select
                        id="exam-subject"
                        required
                        disabled={isEdit} // Subject should not be changed for an existing exam as per business rules
                        value={selectedSubjectId}
                        onChange={(e) => {
                            setSelectedSubjectId(e.target.value)
                            setSelectedTopicIds([])
                        }}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">Selecione uma disciplina...</option>
                        {subjects.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                                {sub.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Exam Date */}
            <div className="space-y-1.5">
                <Label htmlFor="exam-date">Data da Prova</Label>
                <Input
                    id="exam-date"
                    type="date"
                    required
                    min={getTomorrowStr()}
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="h-8 text-sm"
                />
            </div>

            {/* Exam Topics Linkage */}
            {selectedSubjectId && (
                <div className="space-y-2 border-t border-border/40 pt-3">
                    <Label>Associação de Tópicos</Label>

                    {isFetchingTopics ? (
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Carregando tópicos da disciplina...
                        </div>
                    ) : topics.length === 0 ? (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground bg-muted/30 border border-dashed rounded-md p-3 text-center">
                                Nenhum tópico de estudo foi cadastrado para esta disciplina ainda.
                            </p>
                            
                            {/* Inline Topic Quick Create Form */}
                            <div className="bg-muted/10 border rounded-lg p-3 space-y-2.5">
                                <p className="text-xs font-semibold text-foreground">Criar tópico rapidamente</p>
                                <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
                                    <div className="sm:col-span-2">
                                        <Input
                                            type="text"
                                            placeholder="Nome do tópico (ex: Geometria)"
                                            value={newTopicName}
                                            onChange={(e) => setNewTopicName(e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <select
                                            value={newTopicWeight}
                                            onChange={(e) => setNewTopicWeight(e.target.value as any)}
                                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none"
                                        >
                                            <option value="essential">Essencial (Peso 1.0)</option>
                                            <option value="review">Revisão (Peso 0.5)</option>
                                            <option value="optional">Opcional (Peso 0.2)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleQuickTopicSubmit}
                                        disabled={isCreatingTopic}
                                        className="h-7 text-xs gap-1"
                                    >
                                        {isCreatingTopic ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Plus className="h-3.5 w-3.5" />
                                        )}
                                        Adicionar Tópico
                                    </Button>
                                </div>
                                {topicError && (
                                    <p className="text-[10px] text-destructive">{topicError}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground mb-1">
                                Selecione os tópicos que cairão nesta prova:
                            </p>
                            <div className="grid gap-2 max-h-40 overflow-y-auto border border-border/60 rounded-md p-2 bg-muted/10">
                                {topics.map((topic) => {
                                    const isSelected = selectedTopicIds.includes(topic.id)
                                    return (
                                        <div
                                            key={topic.id}
                                            onClick={() => handleTopicToggle(topic.id)}
                                            className={`flex items-center justify-between gap-2 p-2 rounded-md border text-xs cursor-pointer select-none transition-all duration-150 ${
                                                isSelected
                                                    ? "bg-foreground/5 border-foreground/30 text-foreground font-medium"
                                                    : "bg-background border-border/50 text-muted-foreground hover:bg-muted/30"
                                            }`}
                                        >
                                            <span>{topic.name}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[9px] uppercase font-mono px-1 rounded-sm border ${
                                                    topic.weight === "essential" ? "border-red-200 bg-red-50 text-red-700" :
                                                    topic.weight === "review" ? "border-amber-200 bg-amber-50 text-amber-700" :
                                                    "border-blue-200 bg-blue-50 text-blue-700"
                                                }`}>
                                                    {topic.weight === "essential" ? "Essencial" :
                                                     topic.weight === "review" ? "Revisar" : "Opcional"}
                                                </span>
                                                <div className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                                                    isSelected ? "bg-foreground border-foreground text-background" : "border-input"
                                                }`}>
                                                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Optional: Add topic quick creation even if topics exist */}
                            <div className="flex items-center justify-between border-t border-dashed border-border/60 pt-2">
                                <span className="text-[10px] text-muted-foreground">
                                    {selectedTopicIds.length} de {topics.length} selecionados
                                </span>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="text"
                                        placeholder="Novo tópico rápido..."
                                        value={newTopicName}
                                        onChange={(e) => setNewTopicName(e.target.value)}
                                        className="h-7 text-xs w-48"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="xs"
                                        onClick={handleQuickTopicSubmit}
                                        disabled={isCreatingTopic}
                                        className="h-7 text-xs"
                                    >
                                        + Add
                                    </Button>
                                </div>
                            </div>
                            {topicError && (
                                <p className="text-[10px] text-destructive">{topicError}</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <Alert variant="destructive" className="py-2 text-xs">
                    <AlertTitle className="text-xs">Erro</AlertTitle>
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                {onCancel && (
                    <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit" size="sm" disabled={isLoading || !selectedSubjectId} className="shadow-xs">
                    {isLoading ? "Salvando..." : "Salvar Prova"}
                </Button>
            </div>
        </form>
    )
}
