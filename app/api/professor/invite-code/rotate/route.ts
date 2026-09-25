import { proxyBackend } from "@/lib/backend-proxy"

export async function POST(request: Request) {
    return proxyBackend(request, "/professor/invite-code/rotate", { method: "POST", status: 201 })
}
