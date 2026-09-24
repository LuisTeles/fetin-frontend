import { proxyFlashcards } from "../_proxy"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Ctx) {
    const { id } = await params
    return proxyFlashcards(request, `/flashcards/${id}`, { method: "GET", wrap: "flashcard" })
}

export async function PATCH(request: Request, { params }: Ctx) {
    const { id } = await params
    return proxyFlashcards(request, `/flashcards/${id}`, { method: "PATCH", wrap: "flashcard" })
}

export async function DELETE(request: Request, { params }: Ctx) {
    const { id } = await params
    return proxyFlashcards(request, `/flashcards/${id}`, { method: "DELETE" })
}
