import { proxyBackend } from "@/lib/backend-proxy"

export async function GET(request: Request) {
    return proxyBackend(request, "/classes", { method: "GET", wrap: "classes" })
}
