import { FormEvent, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Check } from "lucide-react"

type Task = {
    id: string
    title: string
    description?: string
    date: string
    color: string
    category: "study" | "work" | "hobby" | "other"
}

type TaskFormProps = {
    task?: Task
    defaultDate?: string // Format: YYYY-MM-DD
    onSuccess: () => void
    onCancel?: () => void
}

const COLOR_PRESETS = [
    { value: "#3B82F6", name: "Azul" },
    { value: "#10B981", name: "Verde" },
    { value: "#8B5CF6", name: "Roxo" },
    { value: "#F59E0B", name: "Laranja" },
    { value: "#EF4444", name: "Vermelho" },
    { value: "#6B7280", name: "Cinza" },
]

const CATEGORY_PRESETS = [
    { value: "study", label: "Estudos" },
    { value: "work", label: "Trabalho" },
    { value: "hobby", label: "Hobby" },
    { value: "other", label: "Outros" },
]

export function TaskForm({ task, defaultDate, onSuccess, onCancel }: TaskFormProps) {
    const isEdit = !!task

    const [title, setTitle] = useState(task?.title ?? "")
    const [description, setDescription] = useState(task?.description ?? "")
    
    // Set default datetime to defaultDate (passed from calendar click) + "T12:00"
    const [dateTime, setDateTime] = useState(() => {
        if (task?.date) {
            // ISO format from DB is typically like 2026-07-20T14:00:00.000Z
            // We need to convert it to YYYY-MM-DDTHH:MM for datetime-local
            const d = new Date(task.date)
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, "0")
            const day = String(d.getDate()).padStart(2, "0")
            const hours = String(d.getHours()).padStart(2, "0")
            const minutes = String(d.getMinutes()).padStart(2, "0")
            return `${year}-${month}-${day}T${hours}:${minutes}`
        }
        if (defaultDate) {
            return `${defaultDate}T12:00`
        }
        
        // Default to current time
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, "0")
        const day = String(now.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}T12:00`
    })

    const [color, setColor] = useState(task?.color ?? "#3B82F6")
    const [category, setCategory] = useState<"study" | "work" | "hobby" | "other">(task?.category ?? "study")

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (!title.trim()) {
            setError("O título da tarefa é obrigatório.")
            return
        }
        if (!dateTime) {
            setError("A data e hora são obrigatórias.")
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const parsedDate = new Date(dateTime).toISOString()
            const payload = {
                title: title.trim(),
                description: description.trim() || undefined,
                date: parsedDate,
                color,
                category,
            }

            const url = isEdit ? `/api/tasks/${task.id}` : "/api/tasks"
            const method = isEdit ? "PATCH" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            const resData = await response.json().catch(() => ({}))

            if (!response.ok) {
                setError(resData.message ?? "Ocorreu um erro ao salvar a tarefa.")
                return
            }

            onSuccess()
        } catch (err) {
            setError("Erro ao se conectar com o servidor.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-1.5">
                <Label htmlFor="title">Título</Label>
                <Input
                    id="title"
                    placeholder="Ex: Estudar Álgebra Linear"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isLoading}
                    required
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Input
                    id="description"
                    placeholder="Ex: Resolver exercícios do capítulo 3"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isLoading}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="dateTime">Data & Hora</Label>
                    <Input
                        id="dateTime"
                        type="datetime-local"
                        value={dateTime}
                        onChange={(e) => setDateTime(e.target.value)}
                        disabled={isLoading}
                        required
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="category">Categoria</Label>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        disabled={isLoading}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {CATEGORY_PRESETS.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Colors Preset Selector */}
            <div className="space-y-2">
                <Label>Cor de Destaque</Label>
                <div className="flex items-center gap-2">
                    {COLOR_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            type="button"
                            onClick={() => setColor(preset.value)}
                            disabled={isLoading}
                            className="relative w-8 h-8 rounded-full border border-black/10 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
                            style={{ backgroundColor: preset.value }}
                            title={preset.name}
                        >
                            {color === preset.value && (
                                <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                )}
                <Button type="submit" disabled={isLoading} className="cursor-pointer">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        "Salvar Tarefa"
                    )}
                </Button>
            </div>
        </form>
    )
}
