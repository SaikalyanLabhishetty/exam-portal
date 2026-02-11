"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (res?.error) {
                setError("Invalid email or password")
                return
            }

            const tokenRes = await fetch("/api/auth/token", {
                method: "POST",
            })

            if (!tokenRes.ok) {
                setError("Unable to create access token")
                return
            }

            router.push("/admin")
        } catch (err) {
            setError("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 transition-colors duration-300">
            <div className="max-w-md w-full space-y-8 bg-white dark:bg-zinc-900 p-10 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl transition-colors duration-300">
                <div className="text-center">
                    <h2 className="mt-6 text-4xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">
                        Admin Login
                    </h2>
                    <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-[0.2em] font-black">
                        Nexus Control Center
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label htmlFor="email-address" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                                Email Address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none block w-full px-5 py-4 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-bold"
                                placeholder="name@organization.com"
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="password" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                                Secure Token
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none block w-full px-5 py-4 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-bold"
                                placeholder="Enter Password"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-600 dark:text-red-400 text-[10px] text-center font-black uppercase tracking-widest bg-red-500/10 py-3 rounded-xl border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-4 px-4 text-xs font-black uppercase tracking-[0.2em] rounded-2xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                        >
                            {loading ? "Authenticating..." : "Authenticate"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
