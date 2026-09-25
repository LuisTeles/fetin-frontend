import Link from "next/link"

import { SessionExpired } from "@/app/(dashboard)/dashboard/_components/session-expired"
import { AssignmentForm } from "@/components/professor/assignment-form"
import type { ClassStudent } from "@/lib/api/professor"
import { getAnalytics } from "@/lib/server-data"

export const dynamic = "force-dynamic"

export default async function NewAssignmentPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const raw = params.studentId
    const preselected = Array.isArray(raw) ? raw[0] : raw
    const result = await getAnalytics<{ students: ClassStudent[] }>("/professor/dashboard/students")

    return (
        <section className="space-y-6">
            <div className="space-y-1 border-b border-border/40 pb-4">
                <Link href="/professor/assignments" className="text-xs text-muted-foreground hover:underline">← Atividades enviadas</Link>
                <h1 className="page-title">Nova atividade</h1>
                <p className="text-xs text-muted-foreground">
                    Escreva o material em markdown e termine com um bloco <code>```quiz</code>. A nota é calculada automaticamente quando o aluno responder.
                </p>
            </div>

            {!result.ok ? (
                result.sessionExpired ? (
                    <SessionExpired />
                ) : (
                    <div role="status" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{result.error}</div>
                )
            ) : (
                <AssignmentForm
                    students={result.data.students.map((s) => ({ id: s.id, name: s.name }))}
                    preselectedStudentId={preselected}
                />
            )}
        </section>
    )
}
