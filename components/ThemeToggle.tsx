"use client"

import React from "react"
import { useTheme } from "./ThemeContext"

const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const applyTheme = React.useCallback((nextTheme: "dark" | "light") => {
        if (typeof document === "undefined") return

        const root = document.documentElement
        root.classList.toggle("dark", nextTheme === "dark")
        root.style.colorScheme = nextTheme
        try {
            localStorage.setItem("theme", nextTheme)
        } catch {
            // Ignore storage errors (private mode, blocked storage, etc.).
        }
    }, [])

    React.useEffect(() => {
        if (!mounted) return
        applyTheme(theme)
    }, [applyTheme, mounted, theme])

    const handleToggle = () => {
        const nextTheme = theme === "dark" ? "light" : "dark"
        applyTheme(nextTheme)
        toggleTheme()
    }

    if (!mounted) {
        return (
            <div className="p-3 bg-zinc-800 rounded-xl border border-zinc-700 w-[46px] h-[46px]" />
        )
    }

    return (
        <button
            type="button"
            onClick={handleToggle}
            className="p-3 bg-white text-black dark:bg-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-all border border-zinc-200 dark:border-zinc-700 shadow-xl group"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-pressed={theme === "dark"}
        >
            {theme === "dark" ? (
                // Sun Icon
                <svg className="w-5 h-5 text-yellow-500 group-hover:rotate-45 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
                </svg>
            ) : (
                // Moon Icon
                <svg className="w-5 h-5 text-blue-600 group-hover:-rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            )}
        </button>
    )
}

export default ThemeToggle
