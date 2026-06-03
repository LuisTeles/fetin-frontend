import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/api-config"

export default async function HomePage() {
  const cookieStore = await cookies()
  const hasSession =
    cookieStore.has(ACCESS_TOKEN_COOKIE) || cookieStore.has(REFRESH_TOKEN_COOKIE)

  if (hasSession) {
    redirect("/dashboard")
  }

  redirect("/login")
}
