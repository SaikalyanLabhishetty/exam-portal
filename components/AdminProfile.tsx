"use client"

import { useState, useRef, useEffect } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

interface AdminProfileProps {
    user: {
        name?: string | null
        email?: string | null
        image?: string | null
    }
}

export default function AdminProfile({ user }: AdminProfileProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleLogout = async () => {
        setIsLoggingOut(true)
        try {
            // First clear our custom access token via the API
            await fetch("/api/auth/logout", { method: "POST" })

            // Then sign out from NextAuth
            await signOut({ redirect: false })

            // Finally redirect to login
            router.push("/login")
        } catch (error) {
            console.error("Logout failed:", error)
        } finally {
            setIsLoggingOut(false)
        }
    }

    return (
        <div className="relative" ref={menuRef}>
            {/* Popover/Dropdown */}
            {isOpen && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl p-2 animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                    >
                        {isLoggingOut ? (
                            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        )}
                        {isLoggingOut ? "Processing..." : "Logout Account"}
                    </button>
                </div>
            )}

            {/* Profile Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer rounded-2xl transition-all ${isOpen ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-200 dark:hover:bg-zinc-800"
                    }`}
            >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-black italic shadow-lg shadow-blue-500/20 shrink-0">
                    {user?.name?.[0] || user?.email?.[0] || "A"}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-900 dark:text-white truncate font-black tracking-tight">{user?.name || "Admin"}</p>
                    <p className="text-[10px] text-zinc-500 truncate font-bold uppercase tracking-widest">{user?.email}</p>
                </div>
                <div className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                    <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                    </svg>
                </div>
            </div>
        </div>
    )
}
