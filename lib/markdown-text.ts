/**
 * Flattens Markdown to plain text for card previews.
 *
 * Deliberately regex-based rather than parsed: previews only need to look clean, and this
 * also handles sloppy input like "** Teste **" (not valid CommonMark bold) that a real
 * parser would leave as literal asterisks. Output is rendered as text, so it is XSS-safe.
 */
export function markdownToPlainText(source: string): string {
    return source
        .replace(/@(?:subject|topic|exam|note):[0-9a-f-]{36}\[([^\]]+)\]/gi, "$1")
        .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ""))
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/^\s{0,3}#{1,6}\s+/gm, "")
        .replace(/^\s*>\s?/gm, "")
        .replace(/^\s*[-*+]\s+/gm, "• ")
        .replace(/(\*\*|__)\s*(.+?)\s*\1/g, "$2")
        .replace(/(\*|_)\s*(.+?)\s*\1/g, "$2")
        .replace(/~~(.+?)~~/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}
