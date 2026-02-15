"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
}

interface LandingContentProps {
    primaryLink: { href: string; label: string }
    heroLink: { href: string; label: string }
}

export default function LandingContent({ primaryLink, heroLink }: LandingContentProps) {
    const headerRef = useRef<HTMLElement>(null)
    const heroRef = useRef<HTMLDivElement>(null)
    const featuresRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isAnnual, setIsAnnual] = useState(false)

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Header animation
            gsap.from(headerRef.current, {
                y: -100,
                opacity: 0,
                duration: 1,
                ease: "power4.out"
            })

            // Hero animation
            const heroTl = gsap.timeline({ defaults: { ease: "power4.out" } })
            heroTl.from(".hero-badge", { opacity: 0, scale: 0.8, duration: 0.8, delay: 0.2 })
                .from(".hero-title", { opacity: 0, y: 50, duration: 1 }, "-=0.6")
                .from(".hero-description", { opacity: 0, y: 30, duration: 1 }, "-=0.8")
                .from(".hero-buttons", { opacity: 0, y: 20, duration: 0.8 }, "-=0.8")

            gsap.to(".hero-bg-orb", {
                y: "random(-35, 35)",
                x: "random(-30, 30)",
                scale: "random(0.9, 1.15)",
                duration: "random(7, 13)",
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                stagger: {
                    amount: 2,
                    from: "random"
                }
            })

            gsap.to(".hero-bg-ring", {
                rotate: 360,
                duration: 45,
                repeat: -1,
                ease: "none"
            })

            gsap.to(".hero-bg-ring-glow", {
                scale: 1.08,
                opacity: 0.35,
                duration: 5,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            })

            // Features ScrollTrigger
            gsap.from(".feature-card", {
                scrollTrigger: {
                    trigger: featuresRef.current,
                    start: "top 80%",
                },
                opacity: 0,
                y: 50,
                stagger: 0.2,
                duration: 1,
                ease: "power3.out"
            })

            // New Sections Animations
            gsap.utils.toArray<HTMLElement>(".reveal-section").forEach((section) => {
                gsap.from(section, {
                    scrollTrigger: {
                        trigger: section,
                        start: "top 85%",
                    },
                    opacity: 0,
                    y: 60,
                    duration: 1.2,
                    ease: "power4.out"
                })
            })

            gsap.from(".pricing-card", {
                scrollTrigger: {
                    trigger: ".pricing-grid",
                    start: "top 80%",
                    once: true,
                },
                opacity: 0,
                scale: 0.9,
                y: 40,
                stagger: 0.2,
                duration: 1,
                ease: "back.out(1.7)",
                immediateRender: false,
            })

            // Background floating elements animation
            gsap.to(".bg-orb", {
                y: "random(-50, 50)",
                x: "random(-50, 50)",
                duration: "random(10, 20)",
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
                stagger: {
                    amount: 5,
                    from: "random"
                }
            })
        }, containerRef)

        return () => ctx.revert()
    }, [])

    return (
        <div ref={containerRef} className="min-h-screen bg-zinc-950 text-white overflow-x-hidden relative">
            {/* Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="bg-orb absolute top-[10%] left-[15%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="bg-orb absolute top-[60%] right-[10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px]" />
                <div className="bg-orb absolute bottom-[10%] left-[20%] w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 bg-transparent">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold tracking-tighter">
                        Exam<span className="text-blue-500">Portal</span>
                    </h1>
                    <Link
                        href={primaryLink.href}
                        className="px-6 py-2 bg-white text-zinc-950 font-bold rounded-full hover:bg-zinc-200 transition-all active:scale-95 text-sm"
                    >
                        {primaryLink.label}
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <main className="relative">
                <section ref={heroRef} className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-y-0 left-1/2 w-screen -translate-x-1/2">
                            <div className="hero-bg-orb absolute -top-16 left-[10%] h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
                            <div className="hero-bg-orb absolute top-8 right-[12%] h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
                            <div className="hero-bg-orb absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[140px]" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="hero-bg-ring h-[560px] w-[560px] rounded-full border border-blue-400/15" />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="hero-bg-ring hero-bg-ring-glow h-[420px] w-[420px] rounded-full border border-indigo-400/20" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent" />
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-6 text-center space-y-10">
                        <div className="hero-badge inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest">
                            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
                            Next-Gen Examination Suite
                        </div>

                        <h1 className="hero-title hero-title-neon text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.95]">
                            Powering Next-Gen Digital Assessments
                        </h1>

                        <p className="hero-description text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
                            AI-powered proctoring, real-time tracking, and interruption-free
                            assessments — all in one powerful platform.
                        </p>

                        <div className="hero-buttons flex flex-col sm:flex-row gap-4 justify-center pt-8">
                            <Link
                                href={heroLink.href}
                                className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-[0_20px_40px_-15px_rgba(37,99,235,0.4)] active:scale-95"
                            >
                                {heroLink.label}
                            </Link>
                            <a
                                href="#features"
                                className="px-10 py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all border border-white/5 active:scale-95"
                            >
                                Explore Stack
                            </a>
                        </div>
                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-6">
                    {/* Benefits Sections */}
                    <div className="mt-60 space-y-40">
                    {/* For Students */}
                    <section className="reveal-section grid md:grid-cols-2 gap-20 items-center">
                        <div className="space-y-6">
                            <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-xs">For Students</span>
                            <h2 className="text-4xl md:text-6xl font-black tracking-tight uppercase">Seamless Join. <br />Fair Outcomes.</h2>
                            <p className="text-zinc-400 text-lg md:text-xl leading-relaxed max-w-lg">
                                No hardware tokens or complex logins. Use your institute ID to join instantly.
                                Our AI ensures a level playing field for every candidate.
                            </p>
                            <ul className="space-y-4 text-zinc-300 font-medium">
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Zero-Account Entrance</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Real-time Support Chat</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Responsive Design on All Devices</li>
                            </ul>
                        </div>
                        <div className="relative aspect-square bg-zinc-900/50 rounded-3xl border border-white/5 overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent p-12">
                                <div className="w-full h-full border border-white/10 rounded-2xl flex items-center justify-center p-12">
                                    <div className="text-center">
                                        <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)]">
                                            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="w-32 h-2 bg-white/20 rounded-full mx-auto" />
                                            <div className="w-24 h-2 bg-white/10 rounded-full mx-auto" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* For Teachers */}
                    <section className="reveal-section grid md:grid-cols-2 gap-20 items-center md:flex-row-reverse">
                        <div className="md:order-last space-y-6">
                            <span className="text-purple-500 font-black uppercase tracking-[0.3em] text-xs">For Teachers</span>
                            <h2 className="text-4xl md:text-6xl font-black tracking-tight uppercase">Teach More. <br />Grade Less.</h2>
                            <p className="text-zinc-400 text-lg md:text-xl leading-relaxed max-w-lg">
                                Create complex assessments in minutes. Automated grading and plagiarism
                                checks handle the heavy lifting so you can focus on mentorship.
                            </p>
                            <ul className="space-y-4 text-zinc-300 font-medium">
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full" /> AI Question Generator</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full" /> Instant Result Distribution</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full" /> Detailed Student Psychometry</li>
                            </ul>
                        </div>
                        <div className="relative aspect-square bg-zinc-900/50 rounded-3xl border border-white/5 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent p-12">
                                <div className="w-full h-full border border-white/10 rounded-2xl flex items-center justify-center p-12">
                                    <div className="w-full space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="flex gap-4 items-center">
                                                <div className="w-8 h-8 rounded bg-purple-500/20" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="w-full h-2 bg-white/20 rounded-full" />
                                                    <div className="w-2/3 h-2 bg-white/10 rounded-full" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* For Organizations */}
                    <section className="reveal-section grid md:grid-cols-2 gap-20 items-center">
                        <div className="space-y-6">
                            <span className="text-indigo-500 font-black uppercase tracking-[0.3em] text-xs">For Organizations</span>
                            <h2 className="text-4xl md:text-6xl font-black tracking-tight uppercase">Built for <br />Compliance.</h2>
                            <p className="text-zinc-400 text-lg md:text-xl leading-relaxed max-w-lg">
                                Secure your institutional integrity with enterprise-grade encryption,
                                audit logs, and SOC2 compliant data handling.
                            </p>
                            <ul className="space-y-4 text-zinc-300 font-medium">
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> White-label Solution</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> SSO & SIS Integration</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Regional Data Residency</li>
                            </ul>
                        </div>
                        <div className="relative aspect-square bg-zinc-900/50 rounded-3xl border border-white/5 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent p-12">
                                <div className="w-full h-full border border-white/10 rounded-2xl flex flex-wrap gap-4 items-center justify-center p-8">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                                        <div key={i} className="w-12 h-12 rounded-xl bg-indigo-500/20 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Target Audience Section */}
                <div className="mt-60 reveal-section text-center">
                    <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-xs">Ecosystem</span>
                    <h2 className="text-4xl md:text-7xl font-black tracking-tight uppercase mt-4 mb-20 leading-none">Powering Every <br />Learning Frontier.</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { label: "Universities", count: "500+" },
                            { label: "K-12 Schools", count: "1200+" },
                            { label: "Certifiers", count: "250+" },
                            { label: "Corporate", count: "800+" }
                        ].map((item, idx) => (
                            <div key={idx} className="p-8 bg-zinc-900/40 border border-white/5 rounded-3xl">
                                <div className="text-3xl font-black text-white mb-2">{item.count}</div>
                                <div className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pricing Section */}
                <div className="mt-60">
                    <div className="text-center mb-12 reveal-section">
                        <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-xs">Monetization</span>
                        <h2 className="text-4xl md:text-7xl font-black tracking-tight uppercase mt-4 mb-8">Transparent Pricing.</h2>

                        {/* Billing Toggle */}
                        <div className="flex items-center justify-center gap-4 mb-12">
                            <span className={`text-xs font-black uppercase tracking-widest transition-colors ${!isAnnual ? 'text-white' : 'text-zinc-500'}`}>Monthly</span>
                            <button
                                onClick={() => setIsAnnual(!isAnnual)}
                                className="w-14 h-7 bg-zinc-900 border border-white/10 rounded-full relative p-1 transition-all"
                            >
                                <div className={`w-5 h-5 bg-blue-600 rounded-full transition-transform duration-300 ${isAnnual ? 'translate-x-7' : 'translate-x-0'}`} />
                            </button>
                            <span className={`text-xs font-black uppercase tracking-widest transition-colors ${isAnnual ? 'text-white' : 'text-zinc-500'}`}>Yearly <span className="text-blue-500 ml-1 text-[8px] bg-blue-500/10 px-2 py-0.5 rounded-full">-20%</span></span>
                        </div>
                    </div>

                    <div className="pricing-grid grid md:grid-cols-3 gap-8 items-end">
                        {[
                            {
                                name: "ESSENTIALS",
                                price: isAnnual ? "39" : "49",
                                description: "Perfect for individual educators and small batches.",
                                features: ["Up to 500 candidates", "Standard AI proctoring", "PDF exports", "Email support", "Basic Analytics"],
                                color: "border-white/5",
                                buttonStyle: "bg-zinc-800 hover:bg-zinc-700"
                            },
                            {
                                name: "PROFESSIONAL",
                                price: isAnnual ? "119" : "149",
                                description: "Scale your institution with advanced AI and dedicated support.",
                                features: ["Up to 5000 candidates", "Advanced behavior AI", "SSO integration", "Priority support", "Live Dashboard", "CSV Exports"],
                                color: "border-blue-500/50 bg-blue-500/[0.03] scale-105",
                                popular: true,
                                buttonStyle: "bg-blue-600 hover:bg-blue-500 shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)]"
                            },
                            {
                                name: "ENTERPRISE",
                                price: "Custom",
                                description: "Mission-critical reliability for enterprise-scale operations.",
                                features: ["Unlimited candidates", "Custom AI training", "24/7 Dedicated Ops", "On-premise deploy", "Custom Branding", "SLA Guarantee"],
                                color: "border-white/5",
                                buttonStyle: "bg-zinc-800 hover:bg-zinc-700"
                            }
                        ].map((tier, idx) => (
                            <div key={idx} className={`pricing-card relative p-10 rounded-[40px] border ${tier.color} backdrop-blur-3xl group hover:border-blue-500/30 transition-all duration-500 flex flex-col min-h-[500px]`}>
                                {tier.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_10px_20px_rgba(37,99,235,0.3)] z-10 animate-bounce">Most Popular</div>
                                )}

                                <div className="mb-8">
                                    <div className="text-[10px] font-black text-zinc-500 mb-2 uppercase tracking-[0.3em]">{tier.name}</div>
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-5xl font-black text-white">{tier.price === "Custom" ? "" : "$"}{tier.price}</span>
                                        {tier.price !== "Custom" && <span className="text-sm text-zinc-600 font-bold uppercase tracking-widest">/mo</span>}
                                    </div>
                                    <p className="text-zinc-500 text-xs font-medium leading-relaxed">{tier.description}</p>
                                </div>

                                <div className="space-y-4 mb-12 flex-1">
                                    {tier.features.map((f, i) => (
                                        <div key={i} className="flex gap-3 text-sm font-medium items-start group/item">
                                            <div className="mt-1 w-4 h-4 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover/item:bg-blue-500/30 transition-colors">
                                                <svg className="w-2.5 h-2.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <span className="text-zinc-400 group-hover/item:text-zinc-200 transition-colors">{f}</span>
                                        </div>
                                    ))}
                                </div>

                                <button className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 ${tier.buttonStyle}`}>
                                    {tier.price === "Custom" ? "Contact Sales" : "Get Started Now"}
                                </button>

                                <div className="mt-6 text-center">
                                    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">No credit card required</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 pt-24 pb-12 mt-40 bg-zinc-950">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-20">
                        <div className="col-span-1 md:col-span-1">
                            <h1 className="text-2xl font-black tracking-tighter mb-6">
                                Exam<span className="text-blue-500">Portal</span>
                            </h1>
                            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs mb-8 font-medium">
                                Redefining digital assessment through AI and human-centric design. Trusted by global leaders.
                            </p>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Platform</h4>
                            <ul className="space-y-3 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                                <li><a href="#" className="hover:text-blue-500 transition-all">AI Proctoring</a></li>
                                <li><a href="#" className="hover:text-blue-500 transition-all">Analytics</a></li>
                                <li><a href="#" className="hover:text-blue-500 transition-all">API Access</a></li>
                                <li><a href="#" className="hover:text-blue-500 transition-all">Compliance</a></li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Resources</h4>
                            <ul className="space-y-3 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                                <li><a href="#" className="hover:text-blue-500 transition-all">Help Center</a></li>
                                <li><a href="#" className="hover:text-blue-500 transition-all">Documentation</a></li>
                                <li><a href="#" className="hover:text-blue-500 transition-all">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-blue-500 transition-all">Terms of Service</a></li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Connect</h4>
                            <ul className="space-y-3 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                                <li><a href="#" className="hover:text-blue-500 transition-all">Twitter</a></li>
                                <li><a href="#" className="hover:text-blue-500 transition-all">LinkedIn</a></li>
                                <li><a href="#" className="hover:text-blue-500 transition-all">GitHub</a></li>
                                <li><a href="#" className="hover:text-blue-500 transition-all">Discord</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/5 pt-12">
                        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                            © 2026 EXAMPORTAL INC. ALL RIGHTS RESERVED.
                        </p>
                        <div className="flex gap-4 items-center">
                            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest text-zinc-500">System Status: Stable</div>
                            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest text-zinc-500">Global PoP: 18</div>
                        </div>
                    </div>
                </div>
            </footer>

            <style jsx>{`
                .hero-title-neon {
                    color: rgb(255, 255, 255);
                    text-shadow:
                        0 0 4px rgba(59, 130, 246, 0.18),
                        0 0 10px rgba(59, 130, 246, 0.12);
                    animation: hero-neon-flicker 5s steps(1, end) infinite;
                    will-change: opacity, filter, color, text-shadow;
                }

                @keyframes hero-neon-flicker {
                    0%,
                    18%,
                    22%,
                    30%,
                    62%,
                    100% {
                        opacity: 1;
                        filter: brightness(1.02);
                        color: rgb(255, 255, 255);
                        text-shadow:
                            0 0 4px rgba(59, 130, 246, 0.18),
                            0 0 10px rgba(59, 130, 246, 0.12);
                    }
                    19%,
                    29%,
                    63% {
                        opacity: 0.62;
                        filter: brightness(0.88);
                        color: rgb(59, 130, 246);
                        text-shadow:
                            0 0 3px rgba(59, 130, 246, 0.15),
                            0 0 8px rgba(59, 130, 246, 0.1);
                    }
                    21%,
                    64% {
                        opacity: 0.9;
                        filter: brightness(0.98);
                        color: rgb(255, 255, 255);
                        text-shadow:
                            0 0 3px rgba(59, 130, 246, 0.15),
                            0 0 8px rgba(59, 130, 246, 0.1);
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .hero-title-neon {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    )
}
