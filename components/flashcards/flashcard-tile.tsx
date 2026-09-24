import Link from "next/link"
import { Link2, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { TagBadge } from "@/components/notes/tag-badge"
import { flashcardLabel, type Flashcard } from "@/lib/api/flashcards"
import { formatDateShort } from "@/lib/format"

export function FlashcardTile({ card, href, onEdit }: { card: Flashcard; href: string; onEdit?: () => void }) {
    const due = new Date(card.dueAt) <= new Date()
    const links = card._count.outgoingLinks + card._count.incomingLinks

    return (
        <Card className="card-interactive group">
            <CardContent className="flex h-full flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                    <Link href={href} className="text-sm font-medium leading-snug hover:underline">
                        {flashcardLabel(card.front, 90) || "(sem frente)"}
                    </Link>
                    {onEdit && (
                        <button type="button" onClick={onEdit} title="Editar" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer">
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">{card.topic.subject.name} · {card.topic.name}</p>
                <div className="mt-auto flex flex-wrap items-center gap-1.5">
                    {card.isArchived ? <Badge variant="outline">Arquivado</Badge>
                        : due ? <Badge>Para revisar</Badge>
                        : <Badge variant="outline">Revisão {formatDateShort(card.dueAt)}</Badge>}
                    {links > 0 && <Badge variant="outline"><Link2 className="mr-1 h-3 w-3" />{links}</Badge>}
                    {card.tags.map((t) => <TagBadge key={t.tagId} name={t.tag.name} color={t.tag.color} />)}
                </div>
            </CardContent>
        </Card>
    )
}
