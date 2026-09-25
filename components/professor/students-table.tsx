"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Send } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { formatDateTime, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ClassStudent } from "@/lib/api/professor"

type SortKey = "risk" | "name" | "retention" | "readiness" | "adherence" | "score"

const pct = (v: number | null) => (v === null ? "—" : formatPercent(v))

/** Nulls sort last in both directions: "no data" is not the best or the worst value. */
function compare(a: ClassStudent, b: ClassStudent, key: SortKey, dir: 1 | -1) {
    if (key === "name") return a.name.localeCompare(b.name) * dir
    if (key === "risk") {
        if (a.at_risk !== b.at_risk) return (a.at_risk ? -1 : 1) * dir
        return ((a.avg_retention ?? -1) - (b.avg_retention ?? -1)) * dir
    }
    const pick = (s: ClassStudent) =>
        key === "retention" ? s.avg_retention : key === "readiness" ? s.next_exam_readiness : key === "adherence" ? s.adherence_30d : s.avg_score_pct
    const [x, y] = [pick(a), pick(b)]
    if (x === null && y === null) return 0
    if (x === null) return 1
    if (y === null) return -1
    return (x - y) * dir
}

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "name", label: "Aluno" },
    { key: "retention", label: "Retenção" },
    { key: "readiness", label: "Prontidão" },
    { key: "adherence", label: "Adesão 30d" },
    { key: "score", label: "Nota média" },
]

export function StudentsTable({ students }: { students: ClassStudent[] }) {
    const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "risk", dir: 1 })
    const rows = useMemo(() => [...students].sort((a, b) => compare(a, b, sort.key, sort.dir)), [students, sort])

    function toggle(key: SortKey) {
        setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))
    }

    return (
        // `relative` matters: the sr-only header cell is position:absolute, and without a positioned
        // ancestor it escapes the scroll container and widens the whole page on narrow screens.
        <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                        {COLUMNS.map((c) => (
                            <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className="px-2 py-2 font-medium">
                                <button type="button" onClick={() => toggle(c.key)} className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground">
                                    {c.label}
                                    {sort.key === c.key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />)}
                                </button>
                            </th>
                        ))}
                        <th scope="col" className="px-2 py-2 font-medium">Última atividade</th>
                        <th scope="col" className="px-2 py-2 font-medium">Atividades</th>
                        <th scope="col" className="px-2 py-2"><span className="sr-only">Ações</span></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((s) => (
                        <tr key={s.id} className="border-b border-border/30 last:border-0">
                            <td className="px-2 py-2">
                                <Link href={`/professor/students/${s.id}`} className="font-medium hover:underline">{s.name}</Link>
                                {s.at_risk && <Badge variant="destructive" className="ml-2">Em risco</Badge>}
                            </td>
                            <td className="num px-2 py-2">{pct(s.avg_retention)}</td>
                            <td className="num px-2 py-2">{pct(s.next_exam_readiness)}</td>
                            <td className="num px-2 py-2">{pct(s.adherence_30d)}</td>
                            <td className="num px-2 py-2">{pct(s.avg_score_pct)}</td>
                            <td className="px-2 py-2 text-xs text-muted-foreground">{s.last_active_at ? formatDateTime(s.last_active_at) : "Nunca"}</td>
                            <td className="num px-2 py-2 text-xs text-muted-foreground">{s.assignments_submitted}/{s.assignments_sent}</td>
                            <td className="px-2 py-2 text-right">
                                <Link href={`/professor/assignments/new?studentId=${s.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}>
                                    <Send className="h-3.5 w-3.5" aria-hidden="true" />Enviar atividade
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
