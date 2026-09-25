import { proxyBackend } from "@/lib/backend-proxy"

type Ctx = { params: Promise<{ id: string; studentId: string }> }

export async function GET(request: Request, { params }: Ctx) {
    const { id, studentId } = await params
    return proxyBackend(request, `/presets/${id}/students/${studentId}`, { method: "GET", wrap: "student" })
}
