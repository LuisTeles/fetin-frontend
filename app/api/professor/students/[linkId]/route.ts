import { proxyBackend } from "@/lib/backend-proxy"

type Ctx = { params: Promise<{ linkId: string }> }

export async function DELETE(request: Request, { params }: Ctx) {
    const { linkId } = await params
    return proxyBackend(request, `/professor/students/${linkId}`, { method: "DELETE" })
}
