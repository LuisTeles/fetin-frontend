"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { BookOpen, Search, Plus, Trash2, Edit, ArrowRight, BookOpenCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SubjectForm } from "@/components/dashboard/subject-form"

type Subject = {
    id: string
    name: string
    priority_weight?: number
    priorityWeight?: number
    created_at?: string
}

type SubjectsResponse = {
    subjects?: Subject[]
    message?: string
}

export default function SubjectsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const impersonateUserId = searchParams.get("userId")
    const isImpersonating = !!impersonateUserId

    const [subjects, setSubjects] = useState<Subject[]>([])
    const [search, setSearch] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Form toggle states
    const [showForm, setShowForm] = useState(false)
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null)

    async function loadSubjects() {
        setIsLoading(true)
        setError(null)
        try {
            const url = impersonateUserId ? `/api/subjects?userId=${impersonateUserId}` : "/api/subjects"
            const response = await fetch(url, { cache: "no-store" })
            const payload = (await response.json().catch(() => ({}))) as SubjectsResponse

            if (!response.ok) {
                setError(payload.message ?? "Não foi possível buscar as disciplinas.")
                setIsLoading(false)
                return
            }

            setSubjects(payload.subjects ?? [])
        } catch (err) {
            setError("Erro ao se conectar com o servidor.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadSubjects()
    }, [impersonateUserId])

    async function handleDelete(id: string, name: string, e: React.MouseEvent) {
        e.stopPropagation() // Prevent card navigation
        const confirmed = window.confirm(`Deseja realmente excluir a disciplina "${name}"?`)
        if (!confirmed) return

        try {
            const response = await fetch(`/api/subjects/${id}`, { method: "DELETE" })
            const payload = await response.json().catch(() => ({}))

            if (!response.ok) {
                alert(payload.message ?? "Não foi possível excluir a disciplina.")
                return
            }

            loadSubjects()
        } catch (err) {
            alert("Erro ao excluir a disciplina. Tente novamente.")
        }
    }

    const filteredSubjects = subjects.filter((subject) =>
        subject.name.toLowerCase().includes(search.toLowerCase())
    )

    function handleFormSuccess() {
        setShowForm(false)
        setEditingSubject(null)
        loadSubjects()
    }

    return (
        <section className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col gap-1.5 border-b border-border/40 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Minhas Disciplinas</h1>
                <p className="text-xs text-muted-foreground">
                    Gerencie suas matérias, ajuste os pesos de prioridade de estudo e configure os tópicos.
                </p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-muted/10 p-3 rounded-lg border border-border/50">
                <div className="relative flex-1">
                    <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar disciplina por nome..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-9 text-sm"
                    />
                </div>
                {!isImpersonating && (
                    <Button
                        onClick={() => {
                            setEditingSubject(null)
                            setShowForm(!showForm)
                        }}
                        size="sm"
                        className="h-9 gap-1 shadow-xs shrink-0 cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        Nova Disciplina
                    </Button>
                )}
            </div>

            {/* Inline creation/edit form */}
            {!isImpersonating && (showForm || editingSubject) && (
                <Card className="border-border/60 bg-muted/5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider">
                            {editingSubject ? "Editar Disciplina" : "Nova Disciplina"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <SubjectForm
                            subject={editingSubject ?? undefined}
                            onSuccess={handleFormSuccess}
                            onCancel={() => {
                                setShowForm(false)
                                setEditingSubject(null)
                            }}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Subjects List Grid */}
            {isLoading ? (
                <div className="text-center py-20 border border-dashed rounded-lg space-y-2 text-xs text-muted-foreground">
                    Buscando disciplinas...
                </div>
            ) : error ? (
                <Alert variant="destructive">
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : filteredSubjects.length === 0 ? (
                <div className="text-center py-16 border border-dashed rounded-lg text-xs text-muted-foreground">
                    Nenhuma disciplina encontrada.
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredSubjects.map((subject) => {
                        const priority = subject.priority_weight ?? subject.priorityWeight ?? 5
                        return (
                            <Card 
                                key={subject.id} 
                                className="border-border/60 bg-card shadow-xs hover:border-foreground/20 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                                onClick={() => router.push(`/subjects/${subject.id}${impersonateUserId ? `?userId=${impersonateUserId}` : ""}`)}
                            >
                                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm font-bold flex items-center gap-1.5 line-clamp-1 leading-snug">
                                            <BookOpen className="w-4 h-4 text-primary shrink-0" />
                                            {subject.name}
                                        </CardTitle>
                                        <CardDescription className="text-[10px] text-muted-foreground">
                                            Criada em {subject.created_at ? new Date(subject.created_at).toLocaleDateString("pt-BR") : "N/A"}
                                        </CardDescription>
                                    </div>
                                    {!isImpersonating && (
                                        <div className="flex gap-1 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-7 h-7 hover:bg-muted cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditingSubject(subject)
                                                }}
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-7 h-7 text-red-500 hover:bg-red-500/10 cursor-pointer"
                                                onClick={(e) => handleDelete(subject.id, subject.name, e)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                                            <span>Peso de Prioridade</span>
                                            <span className="font-bold text-foreground">{priority}/10</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                            <div 
                                                className="bg-primary h-full rounded-full" 
                                                style={{ width: `${priority * 10}%` }}
                                            />
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full text-xs font-semibold gap-1 hover:bg-muted cursor-pointer flex items-center justify-center mt-2 border-border/60"
                                    >
                                        Ver Tópicos & Configuração
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
