import { proxyFlashcards } from "../_proxy"

export async function GET(request: Request) {
    return proxyFlashcards(request, "/flashcards/due", { method: "GET", wrap: "flashcards", forwardQuery: true })
}
