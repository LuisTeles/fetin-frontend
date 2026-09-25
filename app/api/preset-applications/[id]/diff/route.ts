import { proxyBackend, type IdCtx } from "@/lib/backend-proxy"

export async function GET(request: Request, { params }: IdCtx) {
    const { id } = await params
    return proxyBackend(request, `/preset-applications/${id}/diff`, { method: "GET", wrap: "diff" })
}
