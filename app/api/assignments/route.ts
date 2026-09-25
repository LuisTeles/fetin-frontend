import { proxyBackend } from "@/lib/backend-proxy"

export async function POST(request: Request) {
    return proxyBackend(request, "/assignments", { method: "POST", status: 201 })
}
