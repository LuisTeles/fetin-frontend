"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { AssignmentApiError, apiSubmitAssignment, type AssignmentResult, type QuizQuestionView } from "@/lib/api/professor"

interface Props {
    assignmentId: string
    questions: QuizQuestionView[]
    initialResult: AssignmentResult | null
}

/**
 * Answer form + result. Grading is done by the server (RN-ASG-05): this component only sends the
 * chosen option indexes and shows what comes back. Once a result exists the form is read-only.
 */
export function QuizForm({ assignmentId, questions, initialResult }: Props) {
    const [answers, setAnswers] = useState<Record<string, number[]>>({})
    const [result, setResult] = useState<AssignmentResult | null>(initialResult)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function toggle(q: QuizQuestionView, index: number) {
        setAnswers((prev) => {
            const current = prev[q.id] ?? []
            if (!q.multi) return { ...prev, [q.id]: [index] }
            return { ...prev, [q.id]: current.includes(index) ? current.filter((i) => i !== index) : [...current, index] }
        })
    }

    async function submit(event: React.FormEvent) {
        event.preventDefault()
        if (busy || result) return
        const unanswered = questions.filter((q) => (answers[q.id] ?? []).length === 0).length
        if (unanswered > 0 && !window.confirm(`${unanswered} questão(ões) sem resposta valem 0 pontos. Enviar mesmo assim? Você só pode responder uma vez.`)) return
        setBusy(true)
        setError(null)
        try {
            setResult(await apiSubmitAssignment(assignmentId, answers))
        } catch (err: unknown) {
            // 409: it was already answered (another tab or a double click); show the recorded result.
            if (err instanceof AssignmentApiError && err.status === 409) window.location.reload()
            setError(err instanceof Error ? err.message : "Erro ao enviar as respostas.")
        } finally {
            setBusy(false)
        }
    }

    const perQuestion = new Map((result?.per_question ?? []).map((q) => [q.id, q]))

    return (
        <form onSubmit={submit} className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            {result && (
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="num text-2xl" aria-live="polite">Sua nota: {result.score} / {result.max_score} pts</CardTitle>
                    </CardHeader>
                </Card>
            )}

            {questions.map((q, i) => {
                const graded = perQuestion.get(q.id)
                return (
                    <fieldset key={q.id} disabled={result !== null || busy} className="space-y-2 rounded-xl border bg-surface p-4">
                        <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
                            {graded && (graded.correct
                                ? <Check className="h-4 w-4 text-success" aria-label="Correta" />
                                : <X className="h-4 w-4 text-danger" aria-label="Incorreta" />)}
                            <span>{i + 1}. {q.prompt} <span className="num text-xs font-normal text-muted-foreground">({q.points} pt{q.points === 1 ? "" : "s"}{q.multi ? " · marque todas as certas" : ""})</span></span>
                        </legend>
                        {q.options.map((opt, idx) => {
                            const checked = graded ? graded.chosen.includes(idx) : (answers[q.id] ?? []).includes(idx)
                            const expected = graded?.expected.includes(idx)
                            return (
                                <label key={idx} className="flex cursor-pointer items-center gap-2 text-sm">
                                    <input
                                        type={q.multi ? "checkbox" : "radio"}
                                        name={q.id}
                                        checked={checked}
                                        onChange={() => toggle(q, idx)}
                                    />
                                    <span className={expected ? "font-medium" : undefined}>{opt}</span>
                                    {expected && <span className="text-xs text-success">resposta correta</span>}
                                </label>
                            )
                        })}
                    </fieldset>
                )
            })}

            {!result && (
                <Button type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar respostas"}</Button>
            )}
        </form>
    )
}
