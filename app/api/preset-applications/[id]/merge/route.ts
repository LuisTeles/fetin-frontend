import { proxyBackend, type IdCtx } from "@/lib/backend-proxy"

export async function POST(request: Request, { params }: IdCtx) {
    const { id } = await params
    return proxyBackend(request, `/preset-applications/${id}/merge`, { method: "POST", wrap: "result", status: 201 })
}
