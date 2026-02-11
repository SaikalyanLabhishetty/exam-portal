import Link from "next/link"
import { getAccessTokenPayload } from "@/lib/access-token"

export default async function HomePage() {
  const tokenPayload = await getAccessTokenPayload()

  const primaryLink = tokenPayload
    ? { href: "/admin", label: "Dashboard" }
    : { href: "/login", label: "Admin Login" }

  const heroLink = tokenPayload
    ? { href: "/admin", label: "Dashboard" }
    : { href: "/login", label: "Get Started" }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">
            Exam<span className="text-blue-500">Portal</span>
          </h1>
          <Link
            href={primaryLink.href}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            {primaryLink.label}
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-medium">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            AI-Powered Proctoring
          </div>

          <h2 className="text-5xl md:text-6xl font-extrabold text-white leading-tight">
            Secure Online Exams
            <br />
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h2>

          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Conduct secure online exams with AI-powered face detection,
            fullscreen enforcement, and real-time proctoring.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Link
              href={heroLink.href}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            >
              {heroLink.label}
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-2xl transition-all border border-zinc-700"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="mt-32 grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Easy Exam Creation",
              description: "Create exams in minutes with CSV upload or manual entry. No complex setup required.",
              icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ),
            },
            {
              title: "AI Face Detection",
              description: "Verify student identity with face matching. Automatic alerts for suspicious activity.",
              icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ),
            },
            {
              title: "No Student Login",
              description: "Students join with just an exam code and ID. No account creation hassle.",
              icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ),
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 hover:border-zinc-700 transition-colors"
            >
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-5">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-zinc-500 text-sm">
          © 2026 ExamPortal. Secure online examination platform.
        </div>
      </footer>
    </div>
  )
}
