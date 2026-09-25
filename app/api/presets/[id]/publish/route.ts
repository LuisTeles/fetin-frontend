import { proxyBackend, type IdCtx } from "@/lib/backend-proxy"

export async function POST(request: Request, { params }: IdCtx) {
    const { id } = await params
    return proxyBackend(request, `/presets/${id}/publish`, { method: "POST", wrap: "result", status: 201 })
}
