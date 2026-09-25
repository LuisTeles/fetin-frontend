import { proxyBackend, type IdCtx } from "@/lib/backend-proxy"

export async function GET(request: Request, { params }: IdCtx) {
    const { id } = await params
    return proxyBackend(request, `/presets/${id}`, { method: "GET", wrap: "preset" })
}

export async function PATCH(request: Request, { params }: IdCtx) {
    const { id } = await params
    return proxyBackend(request, `/presets/${id}`, { method: "PATCH", wrap: "preset" })
}

export async function DELETE(request: Request, { params }: IdCtx) {
    const { id } = await params
    return proxyBackend(request, `/presets/${id}`, { method: "DELETE" })
}
