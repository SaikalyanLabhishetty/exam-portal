import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAccessTokenMaxAgeSeconds, signAccessToken } from "@/lib/auth-token"

export async function POST() {
    const session = await auth()

    if (!session?.user?.email || !session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = signAccessToken({
        sub: session.user.id,
        email: session.user.email,
        role: "admin",
    })

    const response = NextResponse.json({ success: true })
    response.cookies.set("access_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: getAccessTokenMaxAgeSeconds(),
        path: "/",
    })

    return response
}