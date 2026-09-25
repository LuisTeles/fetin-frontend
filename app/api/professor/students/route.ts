import { proxyBackend } from "@/lib/backend-proxy"

export async function GET(request: Request) {
    return proxyBackend(request, "/professor/students", { method: "GET", wrap: "students" })
}
