import { proxyFlashcards } from "../../_proxy"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return proxyFlashcards(request, `/flashcards/${id}/review`, { method: "POST", status: 201 })
}
