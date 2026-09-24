import { proxyFlashcards } from "../../../_proxy"

type Ctx = { params: Promise<{ id: string; targetId: string }> }

export async function POST(request: Request, { params }: Ctx) {
    const { id, targetId } = await params
    return proxyFlashcards(request, `/flashcards/${id}/links/${targetId}`, { method: "POST", status: 201 })
}

export async function DELETE(request: Request, { params }: Ctx) {
    const { id, targetId } = await params
    return proxyFlashcards(request, `/flashcards/${id}/links/${targetId}`, { method: "DELETE" })
}
