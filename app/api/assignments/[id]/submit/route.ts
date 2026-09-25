import { proxyBackend, type IdCtx } from "@/lib/backend-proxy"

export async function POST(request: Request, { params }: IdCtx) {
    const { id } = await params
    return proxyBackend(request, `/assignments/${id}/submit`, { method: "POST", status: 201 })
}
