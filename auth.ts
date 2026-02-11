import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { getDb, toPublicId, UserDocument } from "@/lib/mongodb"

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.JWT_SECRET,
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const db = await getDb()
                const userDoc = (await db
                    .collection<UserDocument>("users")
                    .findOne({ email: credentials.email as string }))
                const user = userDoc ? toPublicId(userDoc) : null

                if (!user) return null

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                )

                if (!isValid) return null

                return {
                    id: user.id,
                    name: user.name ?? undefined,
                    email: user.email,
                }
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user?.id) {
                token.sub = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token?.sub) {
                session.user.id = token.sub
            }
            return session
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnDashboard = nextUrl.pathname.startsWith("/admin")
            const isCreateAdmin = nextUrl.pathname === "/admin/create"

            if (isOnDashboard && !isCreateAdmin) {
                if (isLoggedIn) return true
                return false
            }
            return true
        },
    },
})
