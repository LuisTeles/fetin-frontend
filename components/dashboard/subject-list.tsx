"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Plus, Search, Trash2, Edit2, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SubjectForm } from "./subject-form"

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

type SubjectListProps = {
    onStatsChange?: (stats: { count: number; avgPriority: number }) => void
}

export function SubjectList({ onStatsChange }: SubjectListProps) {
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
                setError(payload.message ?? "Nao foi possivel buscar as disciplinas.")
                setIsLoading(false)
                return
            }

            const list = payload.subjects ?? []
            setSubjects(list)
            
            // Calculate and propagate stats
            if (onStatsChange) {
                const count = list.length
                const totalPriority = list.reduce((sum, item) => sum + (item.priority_weight ?? item.priorityWeight ?? 0), 0)
                const avgPriority = count > 0 ? Number((totalPriority / count).toFixed(1)) : 0
                onStatsChange({ count, avgPriority })
            }
        } catch (err) {
            setError("Erro ao se conectar com o servidor.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadSubjects()
    }, [impersonateUserId])

    async function handleDelete(id: string, name: string) {
        const confirmed = window.confirm(`Deseja realmente excluir a disciplina "${name}"?`)
        if (!confirmed) return

        try {
            const response = await fetch(`/api/subjects/${id}`, { method: "DELETE" })
            const payload = await response.json().catch(() => ({}))

            if (!response.ok) {
                alert(payload.message ?? "Nao foi possivel excluir a disciplina.")
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
        <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                    <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar disciplina..."
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
                        className="h-9 gap-1 shadow-xs"
                    >
                        <Plus className="h-4 w-4" />
                        Nova Disciplina
                    </Button>
                )}
            </div>

            {/* Form Drawer / Embed */}
            {!isImpersonating && (showForm || editingSubject) && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <SubjectForm
                        subject={editingSubject ?? undefined}
                        onSuccess={handleFormSuccess}
                        onCancel={() => {
                            setShowForm(false)
                            setEditingSubject(null)
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
                    Carregando disciplinas...
                </div>
            ) : filteredSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 p-8 text-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-sm font-medium text-foreground">Sem disciplinas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {search ? "Nenhuma disciplina corresponde a sua busca." : "Adicione sua primeira disciplina para comecar."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-2">
                    {filteredSubjects.map((subject) => (
                        <Card key={subject.id} className="group overflow-hidden border border-border/60 hover:border-foreground/20 hover:bg-muted/10 transition-all duration-200 shadow-xs">
                            <CardContent className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground group-hover:bg-foreground group-hover:text-background transition-colors duration-200">
                                        <BookOpen className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {subject.name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            ID: {subject.id.slice(0, 8)}...
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="outline" className="text-xs border-border/80 px-2 py-0.5">
                                        Peso: {subject.priority_weight ?? subject.priorityWeight ?? 0}
                                    </Badge>
                                    
                                    {!isImpersonating && (
                                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                onClick={() => {
                                                    setShowForm(false)
                                                    setEditingSubject(subject)
                                                }}
                                                variant="ghost"
                                                size="icon-xs"
                                                className="hover:bg-muted hover:text-foreground"
                                                title="Editar"
                                            >
                                                <Edit2 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(subject.id, subject.name)}
                                                variant="ghost"
                                                size="icon-xs"
                                                className="hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                                                title="Excluir"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
