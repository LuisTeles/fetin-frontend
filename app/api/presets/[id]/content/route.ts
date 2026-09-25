import { proxyBackend, type IdCtx } from "@/lib/backend-proxy"

export async function PUT(request: Request, { params }: IdCtx) {
    const { id } = await params
    return proxyBackend(request, `/presets/${id}/content`, { method: "PUT", wrap: "preset" })
}
