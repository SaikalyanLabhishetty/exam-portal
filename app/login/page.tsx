"use client"

import { useState, useEffect, useRef } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import gsap from "gsap"
import Link from "next/link"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const lhsRef = useRef<HTMLDivElement>(null)
    const formRef = useRef<HTMLFormElement>(null)
    const scenesRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Initial Entrance
            gsap.from(".login-form-container", {
                x: 100,
                opacity: 0,
                duration: 1,
                ease: "power4.out"
            })

            gsap.from(".form-element", {
                y: 20,
                opacity: 0,
                stagger: 0.1,
                duration: 0.8,
                ease: "power3.out",
                delay: 0.5
            })

            // Scene rotation logic
            const scenes = gsap.utils.toArray(".feature-scene")
            const tl = gsap.timeline({ repeat: -1 })

            scenes.forEach((scene: any, i) => {
                tl.fromTo(scene,
                    { opacity: 0, x: 50, filter: "blur(10px)" },
                    { opacity: 1, x: 0, filter: "blur(0px)", duration: 1, ease: "power3.out" }
                )
                    .to(scene, { opacity: 0, x: -50, filter: "blur(10px)", duration: 1, ease: "power3.in", delay: 3 })
            })
        }, lhsRef)

        return () => ctx.revert()
    }, [])

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
        <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-white overflow-hidden">
            {/* LHS - Feature Showcase */}
            <div ref={lhsRef} className="hidden md:flex md:w-[55%] relative bg-zinc-950 items-center justify-center p-20 overflow-hidden border-r border-white/5">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-full opacity-30">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
                </div>

                <div className="relative z-10 w-full max-w-lg">
                    <Link href="/" className="inline-block mb-12 text-2xl font-black tracking-tighter hover:opacity-80 transition-opacity">
                        EXAM<span className="text-blue-500">PORTAL</span>
                    </Link>

                    <div ref={scenesRef} className="relative h-[400px]">
                        {/* Scene 1: AI Proctoring */}
                        <div className="feature-scene absolute inset-0 flex flex-col justify-center">
                            <div className="mb-8 w-24 h-24 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20 shrink-0">
                                <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </div>
                            <h2 className="text-4xl font-black mb-4 tracking-tight leading-none uppercase">AI-Powered <br /><span className="text-blue-500">Proctoring</span></h2>
                            <p className="text-zinc-400 text-lg leading-relaxed max-w-md">Advanced behavior analysis and face-matching technology to ensure the highest level of examination integrity.</p>
                        </div>

                        {/* Scene 2: Analytics */}
                        <div className="feature-scene absolute inset-0 flex flex-col justify-center">
                            <div className="mb-8 w-24 h-24 bg-purple-500/10 rounded-3xl flex items-center justify-center border border-purple-500/20 shrink-0">
                                <svg className="w-12 h-12 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h2 className="text-4xl font-black mb-4 tracking-tight leading-none uppercase">Real-Time <br /><span className="text-purple-500">Analytics</span></h2>
                            <p className="text-zinc-400 text-lg leading-relaxed max-w-md">Gain instant insights into candidate performance with comprehensive data visualization and automated grading.</p>
                        </div>

                        {/* Scene 3: Scalability */}
                        <div className="feature-scene absolute inset-0 flex flex-col justify-center">
                            <div className="mb-8 w-24 h-24 bg-indigo-500/10 rounded-3xl flex items-center justify-center border border-indigo-500/20 shrink-0">
                                <svg className="w-12 h-12 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </div>
                            <h2 className="text-4xl font-black mb-4 tracking-tight leading-none uppercase">Enterprise <br /><span className="text-indigo-500">Scalability</span></h2>
                            <p className="text-zinc-400 text-lg leading-relaxed max-w-md">Built for mission-critical operations, supporting millions of concurrent users with zero-latency experience.</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Label */}
                <div className="absolute bottom-12 left-20">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Established 2026 / NEXUS OPS</p>
                </div>
            </div>

            {/* RHS - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 md:p-24 relative">
                <div className="login-form-container w-full max-w-md">
                    <div className="mb-12 md:hidden">
                        <Link href="/" className="text-2xl font-black tracking-tighter">
                            EXAM<span className="text-blue-500">PORTAL</span>
                        </Link>
                    </div>

                    <div className="space-y-2 mb-10">
                        <h3 className="form-element text-3xl font-black tracking-tight uppercase">Admin Login</h3>
                        <p className="form-element text-zinc-500 font-medium uppercase text-xs tracking-widest">Authorized Access Only</p>
                    </div>

                    <form ref={formRef} className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div className="form-element space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Identity Endpoint</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold placeholder:text-zinc-700"
                                    placeholder="admin@nexus.com"
                                />
                            </div>
                            <div className="form-element space-y-1.5">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Security Token</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-bold placeholder:text-zinc-700"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="form-element bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl text-center">
                                {error}
                            </div>
                        )}

                        <div className="form-element pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-5 rounded-2xl transition-all shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)] active:scale-95"
                            >
                                {loading ? "Authenticating..." : "Authorize Session"}
                            </button>
                        </div>
                    </form>

                    <div className="form-element mt-10 pt-10 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-600">
                        <Link href="/help" className="hover:text-blue-500 transition-colors">Emergency Reset</Link>
                        <span>V.2.0.4 - STABLE</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
