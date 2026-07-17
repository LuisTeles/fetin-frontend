"use client"

import { use, useEffect, useState, FormEvent } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { 
    BookOpen, 
    ArrowLeft, 
    Settings, 
    Plus, 
    Trash2, 
    CheckCircle2, 
    AlertCircle, 
    ListTodo, 
    Save, 
    GraduationCap, 
    Clock,
    ChevronRight,
    Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Subject = {
    id: string
    name: string
    priority_weight: number
    created_at?: string
}

type Topic = {
    id: string
    subject_id: string
    parent_topic_id: string | null
    name: string
    weight: "essential" | "review" | "optional"
    is_completed: boolean
}

type Exam = {
    id: string
    subject_id: string
    subject_name: string
    exam_date: string
    topics: { id: string; name: string }[]
    pending_topics_count: number
}

type SubjectDetailPageProps = {
    params: Promise<{ id: string }>
}

export default function SubjectDetailPage({ params }: SubjectDetailPageProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { id: subjectId } = use(params)
    const impersonateUserId = searchParams.get("userId")

    // Data states
    const [subject, setSubject] = useState<Subject | null>(null)
    const [topics, setTopics] = useState<Topic[]>([])
    const [exams, setExams] = useState<Exam[]>([])
    
    // Loading & Error states
    const [isLoading, setIsLoading] = useState(true)
    const [isSavingSubject, setIsSavingSubject] = useState(false)
    const [isCreatingTopic, setIsCreatingTopic] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Edit Subject config state
    const [subjectName, setSubjectName] = useState("")
    const [priorityWeight, setPriorityWeight] = useState(5)

    // New Topic state
    const [newTopicName, setNewTopicName] = useState("")
    const [newTopicWeight, setNewTopicWeight] = useState<"essential" | "review" | "optional">("essential")
    const [newTopicParentId, setNewTopicParentId] = useState<string>("")

    async function loadData() {
        setIsLoading(true)
        setError(null)
        try {
            const userIdParam = impersonateUserId ? `?userId=${impersonateUserId}` : ""
            
            // 1. Fetch Subject Detail
            const subjectRes = await fetch(`/api/subjects/${subjectId}${userIdParam}`, { cache: "no-store" })
            if (!subjectRes.ok) {
                setError("Não foi possível carregar as informações da disciplina.")
                setIsLoading(false)
                return
            }
            const subjectData = await subjectRes.json()
            const sub = subjectData.subject
            setSubject(sub)
            setSubjectName(sub.name)
            setPriorityWeight(sub.priority_weight)

            // 2. Fetch Topics belonging to this Subject
            const topicsRes = await fetch(`/api/topics?subjectId=${subjectId}${impersonateUserId ? `&userId=${impersonateUserId}` : ""}`, { cache: "no-store" })
            if (topicsRes.ok) {
                const topicsData = await topicsRes.json()
                setTopics(topicsData.topics ?? [])
            }

            // 3. Fetch Exams (to filter by this Subject)
            const examsRes = await fetch(`/api/exams${userIdParam}`, { cache: "no-store" })
            if (examsRes.ok) {
                const examsData = await examsRes.json()
                const filteredExams = (examsData.exams ?? []).filter(
                    (e: Exam) => e.subject_id === subjectId
                )
                setExams(filteredExams)
            }

        } catch (err) {
            setError("Erro de rede ao carregar os dados.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [subjectId, impersonateUserId])

    // Save Subject Configs
    async function handleSaveSubject(e: FormEvent) {
        e.preventDefault()
        if (!subjectName.trim()) return

        setIsSavingSubject(true)
        try {
            const response = await fetch(`/api/subjects/${subjectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: subjectName.trim(),
                    priorityWeight: Number(priorityWeight),
                }),
            })

            const payload = await response.json()
            if (!response.ok) {
                alert(payload.message ?? "Erro ao salvar configurações.")
                return
            }

            setSubject(payload.subject)
            alert("Configurações salvas com sucesso!")
        } catch {
            alert("Erro ao salvar dados.")
        } finally {
            setIsSavingSubject(false)
        }
    }

    // Toggle Topic Completion status (implements RN-TOP-05 cascade in local state as well)
    async function handleToggleTopicCompletion(topicId: string, currentStatus: boolean) {
        try {
            const nextStatus = !currentStatus
            const response = await fetch(`/api/topics/${topicId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isCompleted: nextStatus }),
            })

            if (!response.ok) {
                const payload = await response.json()
                alert(payload.message ?? "Não foi possível atualizar o tópico.")
                return
            }

            // Update local state dynamically (including subtopics if parent is marked complete)
            setTopics(prevTopics => 
                prevTopics.map(t => {
                    // Update the target topic
                    if (t.id === topicId) {
                        return { ...t, is_completed: nextStatus }
                    }
                    // Cascade to subtopics if target is parent and marked complete
                    if (nextStatus === true && t.parent_topic_id === topicId) {
                        return { ...t, is_completed: true }
                    }
                    return t
                })
            )
        } catch {
            alert("Erro ao atualizar o tópico.")
        }
    }

    // Delete Topic
    async function handleDeleteTopic(topicId: string, name: string) {
        const confirmed = window.confirm(`Deseja realmente excluir o tópico "${name}" e todos os seus subtópicos vinculados?`)
        if (!confirmed) return

        try {
            const response = await fetch(`/api/topics/${topicId}`, { method: "DELETE" })
            if (!response.ok) {
                const payload = await response.json()
                alert(payload.message ?? "Não foi possível excluir o tópico.")
                return
            }

            // Remove from state cascaded items
            setTopics(prev => prev.filter(t => t.id !== topicId && t.parent_topic_id !== topicId))
        } catch {
            alert("Erro ao se conectar com o servidor.")
        }
    }

    // Create Topic
    async function handleCreateTopic(e: FormEvent) {
        e.preventDefault()
        if (!newTopicName.trim()) return

        setIsCreatingTopic(true)
        try {
            const payload = {
                subjectId,
                name: newTopicName.trim(),
                weight: newTopicWeight,
                parentTopicId: newTopicParentId || undefined,
            }

            const response = await fetch("/api/topics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            const resData = await response.json()
            if (!response.ok) {
                alert(resData.message ?? "Erro ao criar tópico.")
                return
            }

            // Append to topics state list
            setTopics(prev => [...prev, resData.topic])
            setNewTopicName("")
            setNewTopicParentId("")
            setNewTopicWeight("essential")
        } catch {
            alert("Erro de conexão ao criar tópico.")
        } finally {
            setIsCreatingTopic(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Carregando dados da disciplina...</span>
            </div>
        )
    }

    if (error || !subject) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 cursor-pointer">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                </Button>
                <Alert variant="destructive">
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{error ?? "Disciplina não encontrada."}</AlertDescription>
                </Alert>
            </div>
        )
    }

    // Render tree structuring
    const parentTopics = topics.filter(t => !t.parent_topic_id)
    const subtopics = topics.filter(t => t.parent_topic_id)

    return (
        <section className="space-y-6">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full w-8 h-8 cursor-pointer shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            {subject.name}
                        </h1>
                        <p className="text-xs text-muted-foreground">Configurações gerais, cronogramas e tópicos da matéria.</p>
                    </div>
                </div>
                <Badge className="font-bold py-0.5 px-2 bg-primary">Peso {subject.priority_weight}/10</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration form column (1/3 width on wide screen) */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-border/60 bg-card shadow-xs">
                        <CardHeader className="p-4 border-b border-border/40">
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                <Settings className="w-4 h-4 text-muted-foreground" />
                                Configurações Básicas
                            </CardTitle>
                            <CardDescription className="text-[10px]">Ajuste as propriedades da disciplina.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            <form onSubmit={handleSaveSubject} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name">Nome da Disciplina</Label>
                                    <Input
                                        id="name"
                                        value={subjectName}
                                        onChange={(e) => setSubjectName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <Label htmlFor="priority">Peso de Prioridade (1 a 10)</Label>
                                        <span className="font-bold text-primary">{priorityWeight}</span>
                                    </div>
                                    <Input
                                        id="priority"
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={priorityWeight}
                                        onChange={(e) => setPriorityWeight(Number(e.target.value))}
                                    />
                                </div>
                                <Button type="submit" disabled={isSavingSubject} className="w-full text-xs font-semibold gap-1 cursor-pointer">
                                    {isSavingSubject ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-3.5 h-3.5" /> Salvar Alterações
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Exams card */}
                    <Card className="border-border/60 bg-card shadow-xs">
                        <CardHeader className="p-4 border-b border-border/40">
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                                Provas Agendadas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            {exams.length === 0 ? (
                                <div className="text-center py-6 border border-dashed rounded-md text-[10px] text-muted-foreground">
                                    Nenhuma prova agendada para esta disciplina.
                                </div>
                            ) : (
                                exams.map(exam => (
                                    <div 
                                        key={exam.id}
                                        onClick={() => router.push("/exams")}
                                        className="p-3 border rounded-lg bg-muted/10 hover:bg-muted/30 cursor-pointer transition-all flex justify-between items-center gap-2 border-border/40"
                                    >
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-rose-500 flex items-center gap-0.5">
                                                <Clock className="w-3 h-3" />
                                                {new Date(exam.exam_date + "T00:00:00").toLocaleDateString("pt-BR")}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">{exam.topics.length} tópicos associados</p>
                                        </div>
                                        {exam.pending_topics_count > 0 ? (
                                            <Badge variant="outline" className="text-[9px] scale-90 border-amber-500/20 text-amber-500 bg-amber-500/5">
                                                {exam.pending_topics_count} pendentes
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[9px] scale-90 border-green-500/20 text-green-500 bg-green-500/5 flex items-center gap-0.5">
                                                <CheckCircle2 className="w-2.5 h-2.5" /> Preparada
                                            </Badge>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Topics Tree Column (2/3 width on wide screen) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Add Topic Card */}
                    <Card className="border-border/60 bg-card shadow-xs">
                        <CardHeader className="p-4 border-b border-border/40">
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                <Plus className="w-4 h-4 text-muted-foreground" />
                                Adicionar Novo Tópico
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <form onSubmit={handleCreateTopic} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                <div className="space-y-1.5 md:col-span-1">
                                    <Label htmlFor="tName">Nome do Tópico</Label>
                                    <Input
                                        id="tName"
                                        placeholder="Ex: Teorema de Tales"
                                        value={newTopicName}
                                        onChange={(e) => setNewTopicName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="tWeight">Peso (Relevância)</Label>
                                    <select
                                        id="tWeight"
                                        value={newTopicWeight}
                                        onChange={(e) => setNewTopicWeight(e.target.value as any)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <option value="essential">Essencial (Prova)</option>
                                        <option value="review">Revisão (Importante)</option>
                                        <option value="optional">Opcional (Complementar)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="tParent">Tópico Pai (Subtópico)</Label>
                                    <select
                                        id="tParent"
                                        value={newTopicParentId}
                                        onChange={(e) => setNewTopicParentId(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <option value="">Nenhum (Tópico Principal)</option>
                                        {parentTopics.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-3 flex justify-end">
                                    <Button type="submit" size="sm" disabled={isCreatingTopic} className="gap-1 cursor-pointer">
                                        {isCreatingTopic ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Plus className="w-3.5 h-3.5" />
                                        )}
                                        Criar Tópico
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Topics List Card */}
                    <Card className="border-border/60 bg-card shadow-xs">
                        <CardHeader className="p-4 border-b border-border/40">
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                <ListTodo className="w-4 h-4 text-muted-foreground" />
                                Tópicos de Estudo Cadastrados
                            </CardTitle>
                            <CardDescription className="text-[10px]">
                                Selecione para marcar como concluído. Tópicos principais marcam todos os subtópicos automaticamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {parentTopics.length === 0 ? (
                                <div className="text-center py-10 border border-dashed rounded-md text-xs text-muted-foreground">
                                    Nenhum tópico cadastrado ainda. Use o formulário acima para adicionar.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {parentTopics.map(parent => {
                                        const children = subtopics.filter(s => s.parent_topic_id === parent.id)
                                        return (
                                            <div key={parent.id} className="border border-border/50 rounded-lg overflow-hidden bg-muted/5">
                                                {/* Parent Topic Row */}
                                                <div className="flex items-center justify-between p-3 bg-muted/20 border-b border-border/30 hover:bg-muted/30 transition-colors">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <input 
                                                            type="checkbox"
                                                            checked={parent.is_completed}
                                                            onChange={() => handleToggleTopicCompletion(parent.id, parent.is_completed)}
                                                            className="rounded-sm border-input text-primary focus:ring-primary w-4 h-4 shrink-0 cursor-pointer"
                                                        />
                                                        <span className={`text-xs font-bold truncate ${parent.is_completed ? "line-through text-muted-foreground/60" : ""}`}>
                                                            {parent.name}
                                                        </span>
                                                        <Badge variant="outline" className={`text-[9px] py-0 px-1.5 uppercase font-semibold shrink-0 scale-90 ${
                                                            parent.weight === "essential" 
                                                                ? "border-red-500/20 text-red-500 bg-red-500/5 font-bold" 
                                                                : parent.weight === "review" 
                                                                    ? "border-amber-500/20 text-amber-500 bg-amber-500/5" 
                                                                    : "border-gray-500/20 text-gray-500 bg-gray-500/5"
                                                        }`}>
                                                            {parent.weight === "essential" ? "Essencial" : parent.weight === "review" ? "Revisão" : "Opcional"}
                                                        </Badge>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="w-7 h-7 text-red-500 hover:bg-red-500/10 cursor-pointer shrink-0"
                                                        onClick={() => handleDeleteTopic(parent.id, parent.name)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>

                                                {/* Subtopics Listing (2nd level) */}
                                                {children.length > 0 && (
                                                    <div className="divide-y divide-border/20 pl-6 bg-background">
                                                        {children.map(child => (
                                                            <div key={child.id} className="flex items-center justify-between p-2.5 hover:bg-muted/10 transition-colors">
                                                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={child.is_completed}
                                                                        onChange={() => handleToggleTopicCompletion(child.id, child.is_completed)}
                                                                        className="rounded-sm border-input text-primary focus:ring-primary w-3.5 h-3.5 shrink-0 cursor-pointer"
                                                                    />
                                                                    <span className={`text-xs truncate ${child.is_completed ? "line-through text-muted-foreground/60" : ""}`}>
                                                                        {child.name}
                                                                    </span>
                                                                    <Badge variant="outline" className={`text-[8px] py-0 px-1 uppercase shrink-0 scale-90 ${
                                                                        child.weight === "essential" 
                                                                            ? "border-red-500/20 text-red-500 bg-red-500/5 font-bold" 
                                                                            : child.weight === "review" 
                                                                                ? "border-amber-500/20 text-amber-500 bg-amber-500/5" 
                                                                                : "border-gray-500/20 text-gray-500 bg-gray-500/5"
                                                                    }`}>
                                                                        {child.weight === "essential" ? "Essencial" : child.weight === "review" ? "Revisão" : "Opcional"}
                                                                    </Badge>
                                                                </div>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="w-6.5 h-6.5 text-red-500 hover:bg-red-500/10 cursor-pointer shrink-0"
                                                                    onClick={() => handleDeleteTopic(child.id, child.name)}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}
