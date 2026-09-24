import { proxyFlashcards } from "./_proxy"

export async function GET(request: Request) {
    return proxyFlashcards(request, "/flashcards", { method: "GET", wrap: "flashcards", forwardQuery: true })
}

export async function POST(request: Request) {
    return proxyFlashcards(request, "/flashcards", { method: "POST", wrap: "flashcard", status: 201 })
}
