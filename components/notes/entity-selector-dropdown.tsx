"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ChevronDown, Loader2, BookOpen, GraduationCap, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    type SubjectEntity,
    type TopicEntity,
    type ExamEntity,
    apiGetSubjects,
    apiGetTopics,
    apiGetExams,
} from "@/lib/api/entities"

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityType = "none" | "subject" | "topic" | "exam"

export interface SelectedEntity {
    type: EntityType
    id: string
    label: string
}

interface EntitySelectorDropdownProps {
    value: SelectedEntity
    onChange: (entity: SelectedEntity) => void
    disabled?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
    Exclude<EntityType, "none">,
    { label: string; icon: React.ReactNode; color: string }
> = {
    subject: {
        label: "Disciplina",
        icon: <BookOpen className="h-3 w-3" />,
        color: "text-blue-500",
    },
    topic: {
        label: "Tópico",
        icon: <GraduationCap className="h-3 w-3" />,
        color: "text-green-500",
    },
    exam: {
        label: "Prova",
        icon: <FileText className="h-3 w-3" />,
        color: "text-orange-500",
    },
}

function formatExamLabel(exam: ExamEntity): string {
    const date = new Date(exam.examDate).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
    return exam.subject?.name ? `${exam.subject.name} — ${date}` : `Prova ${date}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EntitySelectorDropdown({
    value,
    onChange,
    disabled = false,
}: EntitySelectorDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [subjects, setSubjects] = useState<SubjectEntity[]>([])
    const [topics, setTopics] = useState<TopicEntity[]>([])
    const [exams, setExams] = useState<ExamEntity[]>([])
    const [fetchError, setFetchError] = useState<string | null>(null)

    const containerRef = useRef<HTMLDivElement>(null)
    const searchRef = useRef<HTMLInputElement>(null)

    // Load entities when type changes
    useEffect(() => {
        if (value.type === "none") return
        setIsLoading(true)
        setFetchError(null)

        const loaders: Record<Exclude<EntityType, "none">, () => Promise<void>> = {
            subject: async () => {
                const data = await apiGetSubjects()
                setSubjects(data)
            },
            topic: async () => {
                const data = await apiGetTopics()
                setTopics(data)
            },
            exam: async () => {
                const data = await apiGetExams()
                setExams(data)
            },
        }

        loaders[value.type as Exclude<EntityType, "none">]()
            .catch((err: unknown) =>
                setFetchError(err instanceof Error ? err.message : "Erro ao carregar."),
            )
            .finally(() => setIsLoading(false))
    }, [value.type])

    // Focus search on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => searchRef.current?.focus(), 50)
        } else {
            setSearch("")
        }
    }, [isOpen])

    // Click-outside close
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Compute filtered options
    const options: Array<{ id: string; label: string; sublabel?: string }> = (() => {
        const q = search.toLowerCase()
        if (value.type === "subject") {
            return subjects
                .filter((s) => !q || s.name.toLowerCase().includes(q))
                .map((s) => ({ id: s.id, label: s.name }))
        }
        if (value.type === "topic") {
            return topics
                .filter((t) => !q || t.name.toLowerCase().includes(q))
                .map((t) => ({ id: t.id, label: t.name }))
        }
        if (value.type === "exam") {
            return exams
                .filter((e) => {
                    const label = formatExamLabel(e)
                    return !q || label.toLowerCase().includes(q)
                })
                .map((e) => ({ id: e.id, label: formatExamLabel(e) }))
        }
        return []
    })()

    function handleTypeSelect(type: EntityType) {
        onChange({ type, id: "", label: "" })
        if (type !== "none") {
            setIsOpen(false)
        }
    }

    function handleEntitySelect(opt: { id: string; label: string }) {
        onChange({ type: value.type, id: opt.id, label: opt.label })
        setIsOpen(false)
    }

    function handleClear() {
        onChange({ type: "none", id: "", label: "" })
    }

    const typeConfig =
        value.type !== "none" ? TYPE_CONFIG[value.type as Exclude<EntityType, "none">] : null

    return (
        <div className="space-y-2">
            {/* ── Type pills ── */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {(["none", "subject", "topic", "exam"] as EntityType[]).map((type) => {
                    const config = type !== "none" ? TYPE_CONFIG[type as Exclude<EntityType, "none">] : null
                    const label = type === "none" ? "Nenhum" : config!.label
                    return (
                        <button
                            key={type}
                            type="button"
                            disabled={disabled}
                            onClick={() => handleTypeSelect(type)}
                            className={cn(
                                "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium border transition-all cursor-pointer",
                                value.type === type
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                                disabled && "cursor-not-allowed opacity-50",
                            )}
                        >
                            {config && <span className={value.type === type ? "text-current" : config.color}>{config.icon}</span>}
                            {label}
                        </button>
                    )
                })}
            </div>

            {/* ── Entity combobox (visible when a type is selected) ── */}
            {value.type !== "none" && (
                <div ref={containerRef} className="relative">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setIsOpen((prev) => !prev)}
                        className={cn(
                            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs transition-colors",
                            "hover:border-ring focus:outline-none focus:ring-1 focus:ring-ring",
                            disabled && "cursor-not-allowed opacity-50",
                            !disabled && "cursor-pointer",
                        )}
                    >
                        <span className="flex items-center gap-2 truncate">
                            {typeConfig && (
                                <span className={typeConfig.color}>{typeConfig.icon}</span>
                            )}
                            {value.id ? (
                                <span className="font-medium truncate">{value.label}</span>
                            ) : (
                                <span className="text-muted-foreground">
                                    Selecionar {typeConfig?.label ?? ""}…
                                </span>
                            )}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                            {value.id && (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(e) => { e.stopPropagation(); handleClear() }}
                                    onKeyDown={(e) => e.key === "Enter" && handleClear()}
                                    className="rounded p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                                    title="Remover vínculo"
                                >
                                    <X className="h-3 w-3" />
                                </span>
                            )}
                            <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                        </span>
                    </button>

                    {/* Dropdown */}
                    {isOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                            {/* Search */}
                            <div className="border-b border-border p-2">
                                <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder={`Buscar ${typeConfig?.label ?? ""}…`}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                                />
                            </div>

                            {/* Options list */}
                            <div className="max-h-48 overflow-y-auto p-1">
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Carregando…
                                    </div>
                                ) : fetchError ? (
                                    <p className="px-3 py-2 text-xs text-destructive">{fetchError}</p>
                                ) : options.length === 0 ? (
                                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                                        {search ? "Nenhum resultado" : "Nenhum item encontrado"}
                                    </p>
                                ) : (
                                    options.map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => handleEntitySelect(opt)}
                                            className={cn(
                                                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-left transition-colors cursor-pointer",
                                                "hover:bg-muted focus:outline-none focus:bg-muted",
                                                value.id === opt.id && "bg-muted font-medium",
                                            )}
                                        >
                                            <span className="flex-1 truncate">{opt.label}</span>
                                            {value.id === opt.id && (
                                                <Check className="h-3 w-3 text-primary shrink-0" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
