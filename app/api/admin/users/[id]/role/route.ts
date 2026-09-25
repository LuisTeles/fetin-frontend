import { proxyBackend, type IdCtx } from "@/lib/backend-proxy"

export async function PATCH(request: Request, { params }: IdCtx) {
    const { id } = await params
    return proxyBackend(request, `/users/${id}/role`, { method: "PATCH" })
}
