"use client"

import { FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Subject = {
    id: string
    name: string
    priority_weight?: number
    priorityWeight?: number
}

type SubjectFormProps = {
    subject?: Subject
    onSuccess: () => void
    onCancel?: () => void
}

export function SubjectForm({ subject, onSuccess, onCancel }: SubjectFormProps) {
    const [name, setName] = useState(subject?.name ?? "")
    const [priorityWeight, setPriorityWeight] = useState<number>(
        subject?.priority_weight ?? subject?.priorityWeight ?? 5
    )
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isEdit = !!subject

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        if (!name.trim()) {
            setError("O nome da disciplina e obrigatorio.")
            setIsLoading(false)
            return
        }

        if (priorityWeight < 1 || priorityWeight > 10) {
            setError("A prioridade deve ser um numero de 1 a 10.")
            setIsLoading(false)
            return
        }

        const url = isEdit ? `/api/subjects/${subject.id}` : "/api/subjects"
        const method = isEdit ? "PATCH" : "POST"

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    priorityWeight: Number(priorityWeight),
                }),
            })

            const payload = await response.json().catch(() => ({}))

            if (!response.ok) {
                setError(payload.message ?? "Nao foi possivel salvar a disciplina.")
                setIsLoading(false)
                return
            }

            onSuccess()
        } catch (err) {
            setError("Erro de rede. Verifique sua conexao.")
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border/80 bg-card p-4 shadow-sm transition-all duration-200">
            <h3 className="text-sm font-semibold text-foreground">
                {isEdit ? "Editar Disciplina" : "Nova Disciplina"}
            </h3>

            <div className="space-y-1.5">
                <Label htmlFor="subject-name">Nome da Disciplina</Label>
                <Input
                    id="subject-name"
                    type="text"
                    placeholder="Ex: Engenharia de Software"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 text-sm"
                />
            </div>

            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="subject-priority">Prioridade: <span className="font-semibold text-foreground">{priorityWeight}</span></Label>
                    <span className="text-[10px] text-muted-foreground">(1 = Min, 10 = Max)</span>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        id="subject-priority"
                        type="range"
                        min="1"
                        max="10"
                        value={priorityWeight}
                        onChange={(e) => setPriorityWeight(Number(e.target.value))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="py-2 text-xs">
                    <AlertTitle className="text-xs">Erro</AlertTitle>
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
                {onCancel && (
                    <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit" size="sm" disabled={isLoading} className="shadow-xs">
                    {isLoading ? "Salvando..." : "Salvar"}
                </Button>
            </div>
        </form>
    )
}
