"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSanitize from "rehype-sanitize"
import { cn } from "@/lib/utils"
import { WikiLinkRenderer } from "@/components/notes/wiki-link-renderer"

interface MarkdownPreviewProps {
    content: string
    className?: string
}

// ─── Wiki-link preprocessing ──────────────────────────────────────────────────
// Pattern: @type:UUID[Label]
const WIKI_PATTERN =
    /@(?:subject|topic|exam|note):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\[[^\]]+\]/gi

/**
 * Splits content into segments: plain markdown strings and wiki-link tokens.
 * We render each segment separately so react-markdown handles the markdown
 * and WikiLinkRenderer handles the mention pills.
 */
function splitByWikiLinks(content: string): Array<{ kind: "md"; text: string } | { kind: "wiki"; raw: string }> {
    const segments: Array<{ kind: "md"; text: string } | { kind: "wiki"; raw: string }> = []
    let lastIndex = 0
    const pattern = new RegExp(WIKI_PATTERN.source, "gi")
    let match: RegExpExecArray | null

    while ((match = pattern.exec(content)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ kind: "md", text: content.slice(lastIndex, match.index) })
        }
        segments.push({ kind: "wiki", raw: match[0] })
        lastIndex = pattern.lastIndex
    }

    if (lastIndex < content.length) {
        segments.push({ kind: "md", text: content.slice(lastIndex) })
    }

    return segments.length > 0 ? segments : [{ kind: "md", text: content }]
}

// ─── Shared prose classes ─────────────────────────────────────────────────────
const PROSE_CLASSES = [
    "prose prose-sm dark:prose-invert max-w-none text-foreground",
    "[&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1",
    "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2.5 [&_h2]:mb-1",
    "[&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-0.5",
    "[&_p]:text-xs [&_p]:leading-relaxed [&_p]:my-1",
    "[&_strong]:font-semibold [&_em]:italic",
    "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[10px] [&_code]:font-mono",
    "[&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2.5 [&_pre]:text-[10px] [&_pre]:overflow-x-auto",
    "[&_ul]:my-1 [&_ul]:ml-4 [&_ul]:list-disc [&_ul>li]:text-xs [&_ul>li]:my-0.5",
    "[&_ol]:my-1 [&_ol]:ml-4 [&_ol]:list-decimal [&_ol>li]:text-xs [&_ol>li]:my-0.5",
    "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:my-1.5 [&_blockquote]:text-muted-foreground [&_blockquote]:italic",
    "[&_hr]:border-border [&_hr]:my-3",
    "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80",
].join(" ")

// ─── Component ────────────────────────────────────────────────────────────────

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
    if (!content.trim()) {
        return (
            <p className={cn("text-xs text-muted-foreground italic", className)}>
                Nada para pré-visualizar ainda…
            </p>
        )
    }

    const hasWikiLinks = WIKI_PATTERN.test(content)
    // Reset lastIndex after test()
    WIKI_PATTERN.lastIndex = 0

    // Fast path: no wiki links — render pure markdown
    if (!hasWikiLinks) {
        return (
            <div className={cn(PROSE_CLASSES, className)}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                    {content}
                </ReactMarkdown>
            </div>
        )
    }

    // Slow path: split and render segments
    const segments = splitByWikiLinks(content)

    return (
        <div className={cn(PROSE_CLASSES, className)}>
            {segments.map((seg, i) =>
                seg.kind === "wiki" ? (
                    <WikiLinkRenderer key={i} content={seg.raw} />
                ) : (
                    <ReactMarkdown
                        key={i}
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                    >
                        {seg.text}
                    </ReactMarkdown>
                ),
            )}
        </div>
    )
}
