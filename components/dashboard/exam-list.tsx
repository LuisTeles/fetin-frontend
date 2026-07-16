"use client"

import { useEffect, useState } from "react"
import { Calendar, Search, Trash2, Edit2, AlertTriangle, BookOpen, Clock, BadgeAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExamForm } from "./exam-form"

type Topic = {
    id: string
    name: string
    is_completed: boolean
}

type Exam = {
    id: string
    subject_id: string
    subject_name: string
    exam_date: string
    topics: Topic[]
    pending_topics_count: number
    created_at?: string
}

type ExamsResponse = {
    exams?: Exam[]
    message?: string
}

type ExamListProps = {
    onStatsChange?: (stats: { count: number; pendingCount: number }) => void
}

export function ExamList({ onStatsChange }: ExamListProps) {
    const [exams, setExams] = useState<Exam[]>([])
    const [search, setSearch] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Form toggle states
    const [showForm, setShowForm] = useState(false)
    const [editingExam, setEditingExam] = useState<Exam | null>(null)

    async function loadExams() {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetch("/api/exams", { cache: "no-store" })
            const payload = (await response.json().catch(() => ({}))) as ExamsResponse

            if (!response.ok) {
                setError(payload.message ?? "Não foi possível buscar as provas.")
                setIsLoading(false)
                return
            }

            const list = payload.exams ?? []
            setExams(list)

            // Propagate statistics
            if (onStatsChange) {
                const count = list.length
                const pendingCount = list.filter(e => e.pending_topics_count > 0).length
                onStatsChange({ count, pendingCount })
            }
        } catch (err) {
            setError("Erro ao se conectar com o servidor.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadExams()
    }, [])

    async function handleDelete(id: string, date: string, subjectName: string) {
        const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("pt-BR")
        const confirmed = window.confirm(
            `Deseja realmente excluir a prova de "${subjectName}" do dia ${formattedDate}?`
        )
        if (!confirmed) return

        try {
            const response = await fetch(`/api/exams/${id}`, { method: "DELETE" })
            const payload = await response.json().catch(() => ({}))

            if (!response.ok) {
                alert(payload.message ?? "Não foi possível excluir a prova.")
                return
            }

            loadExams()
        } catch (err) {
            alert("Erro ao excluir a prova. Tente novamente.")
        }
    }

    const filteredExams = exams.filter((exam) =>
        exam.subject_name.toLowerCase().includes(search.toLowerCase()) ||
        exam.topics.some((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    )

    function handleFormSuccess() {
        setShowForm(false)
        setEditingExam(null)
        loadExams()
    }

    function formatDate(dateStr: string) {
        // Parse date in local time to avoid timezone offset shifts
        const date = new Date(dateStr + "T00:00:00")
        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
    }

    return (
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                    <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar prova ou tópico..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                    />
                </div>
                <Button
                    onClick={() => {
                        setEditingExam(null)
                        setShowForm(!showForm)
                    }}
                    size="sm"
                    className="h-9 gap-1 shadow-xs"
                >
                    <Calendar className="h-4 w-4" />
                    Agendar Prova
                </Button>
            </div>

            {/* Form Embed */}
            {(showForm || editingExam) && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <ExamForm
                        exam={editingExam ?? undefined}
                        onSuccess={handleFormSuccess}
                        onCancel={() => {
                            setShowForm(false)
                            setEditingExam(null)
                        }}
                    />
                </div>
            )}

            {/* Error Message */}
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Listing */}
            {isLoading ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    Carregando cronograma de provas...
                </div>
            ) : filteredExams.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 p-8 text-center">
                    <Calendar className="h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-sm font-medium text-foreground">Sem provas agendadas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {search ? "Nenhuma prova corresponde à sua busca." : "Agende sua primeira avaliação para gerar cronogramas de estudo."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filteredExams.map((exam) => {
                        const hasNoTopics = exam.topics.length === 0

                        return (
                            <Card key={exam.id} className="group overflow-hidden border border-border/60 hover:border-foreground/20 hover:bg-muted/10 transition-all duration-200 shadow-xs">
                                <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground group-hover:bg-foreground group-hover:text-background transition-colors duration-200 shrink-0">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-foreground truncate">
                                                    {exam.subject_name}
                                                </h4>
                                                <span className="text-[10px] text-muted-foreground">
                                                    (ID: {exam.id.slice(0, 8)}...)
                                                </span>
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDate(exam.exam_date)}
                                                </span>
                                                
                                                {!hasNoTopics && (
                                                    <span className="flex items-center gap-1 font-medium text-foreground/80">
                                                        <BookOpen className="h-3 w-3" />
                                                        {exam.pending_topics_count === 0 
                                                            ? "Tudo concluído!" 
                                                            : `${exam.pending_topics_count} tópicos pendentes`}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Topic Badges or Warning */}
                                            <div className="pt-1">
                                                {hasNoTopics ? (
                                                    <div className="inline-flex items-center gap-1 rounded bg-yellow-50 border border-yellow-200 text-yellow-700 px-2 py-0.5 text-[10px] font-medium animate-pulse">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        Nenhum tópico vinculado (Impossibilita geração de cronograma)
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {exam.topics.map((t) => (
                                                            <span
                                                                key={t.id}
                                                                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] border transition-colors ${
                                                                    t.is_completed
                                                                        ? "border-green-200 bg-green-50 text-green-700 font-medium"
                                                                        : "border-border/80 bg-background text-muted-foreground"
                                                                }`}
                                                            >
                                                                {t.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-border/40 pt-3 sm:border-0 sm:pt-0 shrink-0">
                                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                onClick={() => {
                                                    setShowForm(false)
                                                    setEditingExam(exam)
                                                }}
                                                variant="ghost"
                                                size="icon-xs"
                                                className="hover:bg-muted hover:text-foreground"
                                                title="Editar Prova"
                                            >
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(exam.id, exam.exam_date, exam.subject_name)}
                                                variant="ghost"
                                                size="icon-xs"
                                                className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                                                title="Excluir Prova"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
