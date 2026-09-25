"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Send } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MarkdownPreview } from "@/components/notes/markdown-preview"
import { apiCreateAssignment } from "@/lib/api/professor"
import { parseDraftQuiz, QUIZ_TEMPLATE } from "@/lib/quiz-syntax"

const MAX_CONTENT = 20000

interface Props {
    students: { id: string; name: string }[]
    preselectedStudentId?: string
}

export function AssignmentForm({ students, preselectedStudentId }: Props) {
    const router = useRouter()
    const [studentId, setStudentId] = useState(
        students.some((s) => s.id === preselectedStudentId) ? (preselectedStudentId as string) : "",
    )
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [dueAt, setDueAt] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Live hints only: the server re-parses and is the authority on what is valid.
    const draft = useMemo(() => parseDraftQuiz(content), [content])
    const canSend = !busy && studentId !== "" && title.trim() !== "" && content.trim() !== "" && draft.error === null

    async function submit(event: React.FormEvent) {
        event.preventDefault()
        if (!canSend) return
        setBusy(true)
        setError(null)
        try {
            await apiCreateAssignment({
                studentId,
                title: title.trim(),
                content,
                ...(dueAt ? { dueAt: new Date(`${dueAt}T23:59:00`).toISOString() } : {}),
            })
            router.push("/professor/assignments")
            router.refresh()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Erro ao enviar a atividade.")
            setBusy(false)
        }
    }

    if (students.length === 0) {
        return (
            <Alert>
                <AlertDescription>Sua turma ainda não tem alunos. Compartilhe o código da turma em Meus alunos para poder enviar atividades.</AlertDescription>
            </Alert>
        )
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                    <Label htmlFor="asg-student" className="text-xs text-muted-foreground">Aluno</Label>
                    <select
                        id="asg-student"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        required
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                        <option value="" disabled>Escolha um aluno…</option>
                        {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="asg-title" className="text-xs text-muted-foreground">Título</Label>
                    <Input id="asg-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Revisão: curva do esquecimento" required />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="asg-due" className="text-xs text-muted-foreground">Prazo (opcional)</Label>
                    <Input id="asg-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="asg-content" className="text-xs text-muted-foreground">Conteúdo (markdown)</Label>
                        <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setContent(QUIZ_TEMPLATE)}>
                            Inserir modelo
                        </Button>
                    </div>
                    <textarea
                        id="asg-content"
                        value={content}
                        onChange={(e) => e.target.value.length <= MAX_CONTENT && setContent(e.target.value)}
                        rows={18}
                        spellCheck={false}
                        className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
                        placeholder={"Material de estudo…\n\n```quiz\nQ1 (2 pts): Pergunta?\n- [ ] Errada\n- [x] Certa\n```"}
                    />
                    <p className="text-xs text-muted-foreground" aria-live="polite">
                        {content.trim() === ""
                            ? "Marque as opções certas com [x]. Cada questão vale (N pts), padrão 1; acertar exige marcar exatamente as certas."
                            : draft.error ?? `${draft.questions.length} questão(ões) · ${draft.totalPoints} ponto(s) no total`}
                    </p>
                </div>

                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm font-bold">Como o aluno verá</CardTitle>
                        <CardDescription className="text-xs">O gabarito nunca aparece para o aluno antes de ele responder.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-0">
                        {draft.material && <MarkdownPreview content={draft.material} />}
                        {draft.questions.map((q, i) => (
                            <fieldset key={i} className="space-y-1.5 rounded-md border border-border/50 p-3">
                                <legend className="px-1 text-sm font-semibold">
                                    {i + 1}. {q.prompt} <span className="num text-xs font-normal text-muted-foreground">({q.points} pt{q.points === 1 ? "" : "s"}{q.multi ? " · marque todas as certas" : ""})</span>
                                </legend>
                                {q.options.map((opt, idx) => (
                                    <label key={idx} className="flex items-center gap-2 text-sm">
                                        <input type={q.multi ? "checkbox" : "radio"} disabled aria-hidden="true" tabIndex={-1} />
                                        {opt}
                                    </label>
                                ))}
                            </fieldset>
                        ))}
                        {!draft.material && draft.questions.length === 0 && (
                            <p className="text-xs text-muted-foreground">A prévia aparece aqui enquanto você escreve.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Button type="submit" disabled={!canSend} className="gap-1">
                <Send className="h-4 w-4" aria-hidden="true" />{busy ? "Enviando…" : "Enviar ao aluno"}
            </Button>
        </form>
    )
}
