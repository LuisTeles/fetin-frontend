import { proxyBackend } from "@/lib/backend-proxy"

export async function GET(request: Request) {
    return proxyBackend(request, "/presets", { method: "GET", wrap: "presets", forwardQuery: true })
}

export async function POST(request: Request) {
    return proxyBackend(request, "/presets", { method: "POST", wrap: "preset", status: 201 })
}
