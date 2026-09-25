import { proxyBackend } from "@/lib/backend-proxy"

export async function GET(request: Request) {
    return proxyBackend(request, "/professor-links", { method: "GET", wrap: "links" })
}

export async function POST(request: Request) {
    return proxyBackend(request, "/professor-links", { method: "POST", wrap: "link", status: 201 })
}
