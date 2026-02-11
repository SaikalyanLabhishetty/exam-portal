import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
    // For now, just pass through - auth will be handled by server components
    // The edge runtime doesn't support bcrypt, so we check auth in layout instead
    return NextResponse.next()
}

export const config = {
    matcher: ["/admin/:path*"],
}
