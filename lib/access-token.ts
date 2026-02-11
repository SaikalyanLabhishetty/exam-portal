import { cookies } from "next/headers"
import { verifyAccessToken } from "@/lib/auth-token"

export async function getAccessTokenPayload() {
    const cookieStore = await cookies()
    const token = cookieStore.get("access_token")?.value

    if (!token) return null

    try {
        return verifyAccessToken(token)
    } catch {
        return null
    }
}