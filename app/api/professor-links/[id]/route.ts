import { proxyBackend, type IdCtx } from "@/lib/backend-proxy"

export async function DELETE(request: Request, { params }: IdCtx) {
    const { id } = await params
    return proxyBackend(request, `/professor-links/${id}`, { method: "DELETE" })
}
