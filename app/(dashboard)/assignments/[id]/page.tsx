import Link from "next/link"

import { SessionExpired } from "@/app/(dashboard)/dashboard/_components/session-expired"
import { QuizForm } from "@/components/assignments/quiz-form"
import { MarkdownPreview } from "@/components/notes/markdown-preview"
import { Card, CardContent } from "@/components/ui/card"
import type { AssignmentView } from "@/lib/api/professor"
import { formatDateTime } from "@/lib/format"
import { getAnalytics } from "@/lib/server-data"

export const dynamic = "force-dynamic"

export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const result = await getAnalytics<AssignmentView>(`/assignments/${id}`)

    if (!result.ok) {
        return (
            <section className="space-y-4">
                <Link href="/assignments" className="text-xs text-muted-foreground hover:underline">← Atividades</Link>
                {result.sessionExpired ? (
                    <SessionExpired />
                ) : (
                    <div role="status" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{result.error}</div>
                )}
            </section>
        )
    }

    const a = result.data
    return (
        <section className="space-y-6">
            <div className="space-y-1 border-b border-border/40 pb-4">
                <Link href="/assignments" className="text-xs text-muted-foreground hover:underline">← Atividades</Link>
                <h1 className="page-title">{a.title}</h1>
                <p className="text-xs text-muted-foreground">
                    Prof. {a.professor.name}{a.due_at && a.status === "SENT" ? ` · prazo ${formatDateTime(a.due_at)}` : ""}
                </p>
            </div>

            {a.material && (
                <Card>
                    <CardContent className="p-4"><MarkdownPreview content={a.material} /></CardContent>
                </Card>
            )}

            <QuizForm assignmentId={a.id} questions={a.questions} initialResult={a.result ?? null} />
        </section>
    )
}
