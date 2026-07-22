"use client"

import { BookOpen, GraduationCap, FileText, StickyNote } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Mention pattern ──────────────────────────────────────────────────────────
// Matches: @subject:UUID[Label], @topic:UUID[Label], @exam:UUID[Label], @note:UUID[Label]
// UUID is a standard UUID v4 pattern, label is anything in square brackets
const MENTION_PATTERN =
    /@(subject|topic|exam|note):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\[([^\]]+)\]/gi

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
    subject: {
        icon: <BookOpen className="h-3 w-3" />,
        label: "Disciplina",
        pill: "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400",
    },
    topic: {
        icon: <GraduationCap className="h-3 w-3" />,
        label: "Tópico",
        pill: "bg-green-500/15 text-green-600 border-green-500/30 dark:text-green-400",
    },
    exam: {
        icon: <FileText className="h-3 w-3" />,
        label: "Prova",
        pill: "bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400",
    },
    note: {
        icon: <StickyNote className="h-3 w-3" />,
        label: "Nota",
        pill: "bg-purple-500/15 text-purple-600 border-purple-500/30 dark:text-purple-400",
    },
} as const

// ─── Types ────────────────────────────────────────────────────────────────────

type WikiMention = {
    type: keyof typeof TYPE_CONFIG
    id: string
    label: string
}

// ─── Component ────────────────────────────────────────────────────────────────

interface WikiLinkRendererProps {
    /** Raw markdown content (already HTML-rendered or plain text) */
    content: string
    className?: string
}

/**
 * Parses @type:UUID[Label] wiki-link syntax from content and renders inline pills.
 * Designed to post-process the inner text after markdown rendering.
 */
export function WikiLinkRenderer({ content, className }: WikiLinkRendererProps) {
    const parts = parseWikiLinks(content)

    return (
        <span className={cn("inline", className)}>
            {parts.map((part, i) => {
                if (typeof part === "string") {
                    return <span key={i}>{part}</span>
                }

                const config = TYPE_CONFIG[part.type]
                return (
                    <span
                        key={i}
                        title={`${config.label}: ${part.label}`}
                        className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium align-middle mx-0.5",
                            config.pill,
                        )}
                    >
                        {config.icon}
                        {part.label}
                    </span>
                )
            })}
        </span>
    )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseWikiLinks(content: string): Array<string | WikiMention> {
    const result: Array<string | WikiMention> = []
    let lastIndex = 0
    const pattern = new RegExp(MENTION_PATTERN.source, "gi")
    let match: RegExpExecArray | null

    while ((match = pattern.exec(content)) !== null) {
        // Text before this match
        if (match.index > lastIndex) {
            result.push(content.slice(lastIndex, match.index))
        }

        const [, rawType, id, label] = match
        const type = rawType.toLowerCase() as keyof typeof TYPE_CONFIG

        if (type in TYPE_CONFIG) {
            result.push({ type, id, label })
        } else {
            // Unknown type — keep as raw text
            result.push(match[0])
        }

        lastIndex = pattern.lastIndex
    }

    // Remaining text after last match
    if (lastIndex < content.length) {
        result.push(content.slice(lastIndex))
    }

    return result
}

/**
 * Strips wiki-link syntax from content, leaving only the labels.
 * Useful for generating plain-text previews or titles.
 */
export function stripWikiLinks(content: string): string {
    return content.replace(MENTION_PATTERN, (_, _type, _id, label: string) => label)
}
