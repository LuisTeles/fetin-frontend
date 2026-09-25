import { proxyBackend, type IdCtx } from "@/lib/backend-proxy"

export async function DELETE(request: Request, { params }: IdCtx) {
    const { id } = await params
    return proxyBackend(request, `/preset-applications/${id}`, { method: "DELETE", wrap: "result", forwardQuery: true })
}
