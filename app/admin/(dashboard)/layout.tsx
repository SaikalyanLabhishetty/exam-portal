import { auth } from "@/auth"
import { getAccessTokenPayload } from "@/lib/access-token"
import { redirect } from "next/navigation"
import Link from "next/link"
import ThemeToggle from "@/components/ThemeToggle"
import AdminProfile from "@/components/AdminProfile"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    const tokenPayload = await getAccessTokenPayload()

    if (!session || !tokenPayload) {
        redirect("/login")
    }

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-300 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-6 flex flex-col transition-colors duration-300">
                <div className="mb-8">
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Exam Portal</h1>
                    <p className="text-xs text-zinc-500 font-medium">Admin Dashboard</p>
                </div>

                <nav className="flex-1 space-y-2">
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-xl font-bold text-xs uppercase tracking-widest"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Dashboard
                    </Link>
                    <Link
                        href="/admin/students"
                        className="flex items-center gap-3 px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-xl font-bold text-xs uppercase tracking-widest"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Students
                    </Link>
                    <Link
                        href="/admin/exams"
                        className="flex items-center gap-3 px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-xl font-bold text-xs uppercase tracking-widest"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Exams
                    </Link>
                </nav>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <AdminProfile user={session.user || {}} />
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden">
                <header className="h-20 flex items-center justify-end px-8 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md transition-colors duration-300">
                    <ThemeToggle />
                </header>
                <main className="flex-1 p-8 overflow-auto">{children}</main>
            </div>
        </div>
    )
}
