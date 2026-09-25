import { proxyBackend, type IdCtx } from "@/lib/backend-proxy"

export async function GET(request: Request, { params }: IdCtx) {
    const { id } = await params
    return proxyBackend(request, `/classes/${id}/preview`, { method: "GET", wrap: "preview" })
}
