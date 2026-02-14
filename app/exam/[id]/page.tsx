"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"

type ExamQuestion = {
    question: string
    questionType: "text" | "option"
    options: string[]
}

type AccessResponse = {
    exam: {
        id: string
        name: string
        duration: number
        totalMarks: number
        proctoringEnabled: boolean
        _count: { questions: number }
        organization?: { name: string }
    }
    student: {
        id: string
        name: string
        emailId: string
        rollNo?: string
        section?: string
        year?: string
    }
    questions: ExamQuestion[]
}

type Phase = "access" | "overview" | "exam" | "submitted"

type NavigatorWithKeyboardLock = Navigator & {
    keyboard?: {
        lock?: (keyCodes?: string[]) => Promise<void>
        unlock?: () => void
    }
}

type EscapePressState = {
    isDown: boolean
    downAt: number
    hadRepeat: boolean
    fullscreenExitHandled: boolean
    lastReleasedAt: number
    lastDuration: number
}

type FullscreenRecoveryState = {
    reason: string
    message: string
} | null

type WarningEvent = {
    reason: string
    message: string
    at: string
}

const ESC_LONG_PRESS_MS = 700

const createInitialEscapePressState = (): EscapePressState => ({
    isDown: false,
    downAt: 0,
    hadRepeat: false,
    fullscreenExitHandled: false,
    lastReleasedAt: 0,
    lastDuration: 0,
})

export default function ExamAccessPage() {
    const params = useParams<{ id: string }>()
    const examId = Array.isArray(params?.id) ? params.id[0] : params?.id

    const [studentEmail, setStudentEmail] = useState("")
    const [examCode, setExamCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [accessData, setAccessData] = useState<AccessResponse | null>(null)

    const [phase, setPhase] = useState<Phase>("access")
    const [startError, setStartError] = useState("")
    const [answers, setAnswers] = useState<Record<number, string>>({})
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [submitMsg, setSubmitMsg] = useState("")
    const [currentIndex, setCurrentIndex] = useState(0)
    const [violationCount, setViolationCount] = useState(0)
    const [violationMsg, setViolationMsg] = useState("")
    const [warnings, setWarnings] = useState<WarningEvent[]>([])
    const lastViolationRef = useRef<{ reason: string; at: number }>({ reason: "", at: 0 })
    const isReEnteringFullscreenRef = useRef(false)
    const escapePressRef = useRef<EscapePressState>(createInitialEscapePressState())
    const fullscreenRecoveryRef = useRef<FullscreenRecoveryState>(null)
    const fullscreenRetryTimerRef = useRef<number | null>(null)

    const totalSeconds = useMemo(() => (accessData ? accessData.exam.duration * 60 : null), [accessData])

    const handleSubmitAccess = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!examId) return

        setLoading(true)
        setError("")
        setPhase("access")
        setAccessData(null)

        try {
            const response = await fetch("/api/exams/access", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    examId,
                    studentEmail: studentEmail.trim(),
                    examCode: examCode.trim().toUpperCase(),
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setAccessData(null)
                setError(data.error || "Unable to open exam")
                return
            }

            setAccessData(data)
            setPhase("overview")
        } catch (apiError) {
            console.error("Exam access error:", apiError)
            setError("Unable to connect. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const requestFullscreen = async () => {
        const root = document.documentElement
        if (!root.requestFullscreen) {
            throw new Error("Fullscreen API not supported")
        }
        await root.requestFullscreen()
    }

    const recordViolation = (reason: string, message: string, cooldownMs = 1500) => {
        const now = Date.now()
        const last = lastViolationRef.current
        if (now - last.at < cooldownMs) {
            setViolationMsg(message)
            return
        }
        lastViolationRef.current = { reason, at: now }
        setViolationCount((prev) => prev + 1)
        setViolationMsg(message)
        setWarnings((prev) => [...prev, { reason, message, at: new Date(now).toISOString() }])
    }

    const lockExamKeyboard = async () => {
        const keyboard = (navigator as NavigatorWithKeyboardLock).keyboard
        if (!keyboard?.lock) return
        try {
            await keyboard.lock(["Escape"])
        } catch (err) {
            console.warn("Keyboard lock unavailable:", err)
        }
    }

    const unlockExamKeyboard = () => {
        const keyboard = (navigator as NavigatorWithKeyboardLock).keyboard
        if (!keyboard?.unlock) return
        keyboard.unlock()
    }

    const handleStartExam = async () => {
        if (!accessData) return
        try {
            setStartError("")
            await requestFullscreen()
            await lockExamKeyboard()
            setViolationCount(0)
            setViolationMsg("")
            setWarnings([])
            lastViolationRef.current = { reason: "", at: 0 }
            escapePressRef.current = createInitialEscapePressState()
            fullscreenRecoveryRef.current = null
            if (fullscreenRetryTimerRef.current !== null) {
                window.clearTimeout(fullscreenRetryTimerRef.current)
                fullscreenRetryTimerRef.current = null
            }
            setPhase("exam")
            setTimeLeft(accessData.exam.duration * 60)
            setCurrentIndex(0)
        } catch (err) {
            console.error("Fullscreen error:", err)
            setStartError("Please allow fullscreen to start the exam.")
        }
    }

    useEffect(() => {
        if (phase !== "exam") return
        if (!totalSeconds) return

        const tick = () => {
            setTimeLeft((prev) => {
                if (prev === null) return totalSeconds
                return Math.max(prev - 1, 0)
            })
        }

        const interval = window.setInterval(tick, 1000)
        return () => window.clearInterval(interval)
    }, [phase, totalSeconds])

    useEffect(() => {
        if (phase !== "exam" || !accessData) return

        const clearFullscreenRetryTimer = () => {
            if (fullscreenRetryTimerRef.current !== null) {
                window.clearTimeout(fullscreenRetryTimerRef.current)
                fullscreenRetryTimerRef.current = null
            }
        }

        const clearFullscreenRecovery = () => {
            fullscreenRecoveryRef.current = null
            clearFullscreenRetryTimer()
        }

        const attemptFullscreenRecovery = async () => {
            const pendingRecovery = fullscreenRecoveryRef.current
            if (!pendingRecovery) return

            if (document.fullscreenElement) {
                clearFullscreenRecovery()
                return
            }

            if (document.visibilityState === "hidden" || !document.hasFocus()) return
            if (isReEnteringFullscreenRef.current) return

            isReEnteringFullscreenRef.current = true
            try {
                await requestFullscreen()
                await lockExamKeyboard()
                clearFullscreenRecovery()
            } catch (err) {
                console.warn("Unable to re-enter fullscreen:", err)
                setViolationMsg("Fullscreen is required. Please re-enable to continue.")
                clearFullscreenRetryTimer()
                fullscreenRetryTimerRef.current = window.setTimeout(() => {
                    void attemptFullscreenRecovery()
                }, 250)
            } finally {
                isReEnteringFullscreenRef.current = false
            }
        }

        const scheduleFullscreenRecovery = (delayMs = 0) => {
            clearFullscreenRetryTimer()
            fullscreenRetryTimerRef.current = window.setTimeout(() => {
                void attemptFullscreenRecovery()
            }, delayMs)
        }

        const enforceFullscreen = (reason: string, message: string) => {
            if (document.fullscreenElement) {
                clearFullscreenRecovery()
                return
            }

            const pendingRecovery = fullscreenRecoveryRef.current
            if (
                !pendingRecovery ||
                pendingRecovery.reason !== reason ||
                pendingRecovery.message !== message
            ) {
                recordViolation(reason, message)
            } else {
                setViolationMsg(message)
            }

            fullscreenRecoveryRef.current = { reason, message }
            scheduleFullscreenRecovery(0)
        }

        const blockContext = (e: Event) => e.preventDefault()
        const blockKeys = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase()
            const blockedPlainKeys = ["escape", "f11", "f12"]
            const blockedWithMeta = ["i", "j", "c", "k", "u", "r", "w", "t", "n", "p"]

            if (key === "escape") {
                const now = Date.now()
                const state = escapePressRef.current
                if (!state.isDown) {
                    state.isDown = true
                    state.downAt = now
                    state.hadRepeat = false
                    state.fullscreenExitHandled = false
                }
                if (e.repeat) {
                    state.hadRepeat = true
                }
            }

            if (
                blockedPlainKeys.includes(key) ||
                ((e.ctrlKey || e.metaKey) && blockedWithMeta.includes(key))
            ) {
                e.preventDefault()
                e.stopPropagation()
            }
        }

        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== "escape") return

            const now = Date.now()
            const state = escapePressRef.current
            if (!state.isDown) return

            const heldMs = now - state.downAt
            const isLongPress = state.hadRepeat || heldMs >= ESC_LONG_PRESS_MS

            state.isDown = false
            state.lastReleasedAt = now
            state.lastDuration = heldMs

            if (state.fullscreenExitHandled) return

            if (isLongPress) {
                recordViolation("escape-hold", "User held ESC during the exam.")
                return
            }

            recordViolation("escape-click", "User clicked ESC.")
        }
        const blockVisibility = () => {
            if (document.visibilityState === "hidden") {
                enforceFullscreen(
                    "tab-switch",
                    "User switched to a new tab/app. Re-entering fullscreen."
                )
                return
            }

            if (fullscreenRecoveryRef.current) {
                scheduleFullscreenRecovery(0)
            }
        }
        const blockWindowBlur = () => {
            if (document.visibilityState === "hidden") return
            if (!document.hasFocus()) {
                enforceFullscreen(
                    "window-blur",
                    "Focus left the exam window. Re-entering fullscreen."
                )
            }
        }
        const blockBackNavigation = () => {
            window.history.pushState(null, "", window.location.href)
            enforceFullscreen(
                "back-navigation",
                "Back navigation blocked. Fullscreen exam is still active."
            )
        }
        const resumeFullscreenOnGesture = () => {
            if (!fullscreenRecoveryRef.current || document.fullscreenElement) return
            scheduleFullscreenRecovery(0)
        }
        const onFullscreenChange = () => {
            if (document.fullscreenElement) {
                clearFullscreenRecovery()
                return
            }

            const now = Date.now()
            const state = escapePressRef.current
            const escapeWasRecent = state.isDown || now - state.lastReleasedAt < 600

            if (escapeWasRecent) {
                const heldMs = state.isDown ? now - state.downAt : state.lastDuration
                const isLongPress = state.hadRepeat || heldMs >= ESC_LONG_PRESS_MS
                state.fullscreenExitHandled = true

                if (isLongPress) {
                    enforceFullscreen(
                        "escape-hold-fullscreen-exit",
                        "User held ESC and exited fullscreen. Re-entering fullscreen."
                    )
                    return
                }

                enforceFullscreen(
                    "escape-click-fullscreen-exit",
                    "User clicked ESC and exited fullscreen. Re-entering fullscreen."
                )
                return
            }

            enforceFullscreen(
                "fullscreen-exit",
                "Fullscreen exit detected. Re-entering fullscreen."
            )
        }

        document.addEventListener("contextmenu", blockContext)
        document.addEventListener("keydown", blockKeys, true)
        document.addEventListener("keydown", resumeFullscreenOnGesture, true)
        document.addEventListener("pointerdown", resumeFullscreenOnGesture, true)
        document.addEventListener("keyup", onKeyUp, true)
        document.addEventListener("visibilitychange", blockVisibility)
        window.addEventListener("blur", blockWindowBlur)
        window.addEventListener("focus", resumeFullscreenOnGesture)
        document.addEventListener("fullscreenchange", onFullscreenChange)
        window.history.pushState(null, "", window.location.href)
        window.addEventListener("popstate", blockBackNavigation)

        void lockExamKeyboard()

        return () => {
            document.removeEventListener("contextmenu", blockContext)
            document.removeEventListener("keydown", blockKeys, true)
            document.removeEventListener("keydown", resumeFullscreenOnGesture, true)
            document.removeEventListener("pointerdown", resumeFullscreenOnGesture, true)
            document.removeEventListener("keyup", onKeyUp, true)
            document.removeEventListener("visibilitychange", blockVisibility)
            window.removeEventListener("blur", blockWindowBlur)
            window.removeEventListener("focus", resumeFullscreenOnGesture)
            document.removeEventListener("fullscreenchange", onFullscreenChange)
            window.removeEventListener("popstate", blockBackNavigation)
            isReEnteringFullscreenRef.current = false
            escapePressRef.current = createInitialEscapePressState()
            clearFullscreenRecovery()
            unlockExamKeyboard()
        }
    }, [phase, accessData])

    useEffect(() => {
        if (phase === "exam" && timeLeft === 0) {
            handleSubmitAnswers()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft, phase])

    const handleAnswerChange = (index: number, value: string) => {
        setAnswers((prev) => ({ ...prev, [index]: value }))
    }

    const handleSubmitAnswers = async () => {
        if (!accessData || submitting) return
        setSubmitting(true)
        setSubmitMsg("")
        try {
            const payload = {
                studentId: accessData.student.id,
                answers: Object.entries(answers).map(([questionIndex, answer]) => ({
                    questionIndex: Number(questionIndex),
                    answer,
                })),
                warnings,
            }
            const res = await fetch(`/api/exams/${accessData.exam.id}/answers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const data = await res.json()
                setSubmitMsg(data.error || "Failed to submit answers.")
            } else {
                setSubmitMsg("Answers saved. You may close the exam.")
                setPhase("submitted")
                unlockExamKeyboard()
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => { })
                }
            }
        } catch (err) {
            console.error("Submit answers error:", err)
            setSubmitMsg("Failed to submit answers.")
        } finally {
            setSubmitting(false)
        }
    }

    const confirmAndSubmit = () => {
        if (submitting) return
        const confirmed = window.confirm("Submit the exam now? You cannot change answers after submission.")
        if (confirmed) {
            handleSubmitAnswers()
        }
    }

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return "--:--"
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    }

    const questionCount = accessData?.questions.length ?? 0
    const currentQuestion = accessData?.questions[currentIndex]
    const isLastQuestion = questionCount > 0 && currentIndex === questionCount - 1

    if (!examId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-6">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Invalid Exam Link</h1>
                    <p className="text-zinc-400 text-sm">
                        This exam URL is invalid. Please ask your admin for a valid URL.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            <header className="border-b border-zinc-800/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-white">
                        Exam<span className="text-blue-500">Portal</span>
                    </h1>
                    {phase === "exam" && accessData ? (
                        <span className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-semibold text-zinc-100">
                            Time Left: {formatTime(timeLeft)}
                        </span>
                    ) : (
                        <span className="text-sm text-zinc-400 font-medium">Secure Exam Session</span>
                    )}
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
                {(phase === "access" || phase === "overview") && (
                    <div className="text-center space-y-3">
                        <h2 className="text-3xl font-bold">Exam Access</h2>
                        <p className="text-zinc-400">Enter your student email and exam code to open this exam.</p>
                    </div>
                )}

                {phase === "access" && (
                    <div className="max-w-lg mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                        <form onSubmit={handleSubmitAccess} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm text-zinc-300 font-medium">Student Email</label>
                                <input
                                    type="email"
                                    value={studentEmail}
                                    onChange={(event) => setStudentEmail(event.target.value)}
                                    placeholder="student@example.com"
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm text-zinc-300 font-medium">Exam Code</label>
                                <input
                                    type="text"
                                    value={examCode}
                                    onChange={(event) => setExamCode(event.target.value.toUpperCase())}
                                    placeholder="Enter exam code"
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            {error ? <p className="text-sm text-red-400">{error}</p> : null}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors font-semibold"
                            >
                                {loading ? "Validating..." : "Open Exam"}
                            </button>
                        </form>
                    </div>
                )}

                {phase === "overview" && accessData && (
                    <div className="space-y-6">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <p className="text-green-400 font-semibold mb-3">Access granted</p>
                            <h2 className="text-2xl font-bold">{accessData.exam.name}</h2>
                            <div className="mt-5 flex flex-wrap gap-3 text-sm">
                                <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700">
                                    Duration: {accessData.exam.duration} min
                                </span>
                                <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700">
                                    Questions: {accessData.exam._count.questions}
                                </span>
                                <span className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700">
                                    Proctoring: {accessData.exam.proctoringEnabled ? "Enabled" : "Disabled"}
                                </span>
                            </div>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                            <h3 className="text-lg font-semibold">Exam Instructions</h3>
                            <ul className="space-y-2 text-sm text-zinc-300 list-disc list-inside">
                                <li>This is a proctored exam. You will be monitored throughout the session.</li>
                                <li>The exam will run in full-screen mode. Do not exit full screen.</li>
                                <li>Do not open Developer Tools or inspect the page.</li>
                                <li>Do not switch tabs or applications.</li>
                                <li>All activities will be recorded and monitored.</li>
                                <li>Any suspicious activity may lead to exam termination.</li>
                            </ul>
                        </div>

                        {startError && <p className="text-sm text-red-400">{startError}</p>}

                        <button
                            onClick={handleStartExam}
                            className="w-full md:w-auto px-8 py-3 rounded-xl bg-green-600 hover:bg-green-700 font-semibold"
                        >
                            Start Exam
                        </button>
                    </div>
                )}

                {phase === "exam" && accessData && (
                    <div className="overflow-x-auto">
                        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6 min-w-[900px]">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
                                {questionCount === 0 ? (
                                    <p className="text-zinc-400 text-sm">No questions have been added yet.</p>
                                ) : (
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between text-sm text-zinc-400">
                                            <span>Question {currentIndex + 1} of {questionCount}</span>
                                            <span>Auto-saved</span>
                                        </div>

                                        {currentQuestion && (
                                            <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/50 space-y-3">
                                                <p className="font-semibold text-lg text-white">
                                                    {currentIndex + 1}. {currentQuestion.question}
                                                </p>
                                                {currentQuestion.questionType === "option" && currentQuestion.options.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {currentQuestion.options.map((option, optionIndex) => {
                                                            const value = String.fromCharCode(65 + optionIndex)
                                                            return (
                                                                <label
                                                                    key={`${option}-${optionIndex}`}
                                                                    className="flex items-center gap-3 text-sm text-zinc-200 cursor-pointer"
                                                                >
                                                                    <input
                                                                        type="radio"
                                                                        name={`question-${currentIndex}`}
                                                                        value={value}
                                                                        checked={answers[currentIndex] === value}
                                                                        onChange={() => handleAnswerChange(currentIndex, value)}
                                                                        className="w-4 h-4 text-blue-500 border-zinc-600 focus:ring-blue-500"
                                                                    />
                                                                    <span>{value}. {option}</span>
                                                                </label>
                                                            )
                                                        })}
                                                    </div>
                                                ) : (
                                                    <textarea
                                                        value={answers[currentIndex] ?? ""}
                                                        onChange={(e) => handleAnswerChange(currentIndex, e.target.value)}
                                                        placeholder="Type your answer here..."
                                                        className="w-full min-h-[140px] px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                                                disabled={currentIndex === 0}
                                                className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 font-semibold"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questionCount - 1))}
                                                disabled={currentIndex >= questionCount - 1}
                                                className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 font-semibold"
                                            >
                                                Next
                                            </button>
                                        </div>

                                        {isLastQuestion && (
                                            <div className="pt-2">
                                                <button
                                                    onClick={confirmAndSubmit}
                                                    disabled={submitting}
                                                    className="w-full px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 font-semibold"
                                                >
                                                    {submitting ? "Submitting..." : "Finish Exam"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {submitMsg && <p className="text-sm text-green-400">{submitMsg}</p>}
                            </div>

                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col sticky top-6 self-start max-h-[calc(100vh-7rem)]">
                                <div className="space-y-6 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                                    <div>
                                        <p className="text-xs uppercase text-zinc-500 tracking-widest mb-3 font-bold">Student Details</p>
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <span className="text-zinc-500 text-xs block mb-0.5">Name</span>
                                                <span className="text-white font-medium block">{accessData.student.name}</span>
                                            </div>
                                            {accessData.student.rollNo && (
                                                <div>
                                                    <span className="text-zinc-500 text-xs block mb-0.5">Roll No</span>
                                                    <span className="text-zinc-300 block">{accessData.student.rollNo}</span>
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-zinc-500 text-xs block mb-0.5">Email</span>
                                                <span className="text-zinc-300 block break-all">{accessData.student.emailId}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                {accessData.student.section && (
                                                    <div>
                                                        <span className="text-zinc-500 text-xs block mb-0.5">Section</span>
                                                        <span className="text-zinc-300 block">{accessData.student.section}</span>
                                                    </div>
                                                )}
                                                {accessData.student.year && (
                                                    <div>
                                                        <span className="text-zinc-500 text-xs block mb-0.5">Year</span>
                                                        <span className="text-zinc-300 block">{accessData.student.year}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-t border-zinc-800 pt-4">
                                        <p className="text-xs uppercase text-zinc-500 tracking-widest mb-3 font-bold">Exam Details</p>
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <span className="text-zinc-500 text-xs block mb-0.5">Exam Name</span>
                                                <span className="text-white font-medium block">{accessData.exam.name}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                                                <span className="text-zinc-400 text-xs">Questions</span>
                                                <span className="text-white font-bold">{accessData.exam._count.questions}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                                                <span className="text-zinc-400 text-xs">Total Marks</span>
                                                <span className="text-white font-bold">{accessData.exam.totalMarks}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {violationCount > 0 && (
                                        <div className="border-t border-zinc-800 pt-4">
                                            <p className="text-xs uppercase text-red-500 tracking-widest mb-2 font-bold flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                Warnings
                                            </p>
                                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                                <p className="text-red-400 text-xs font-bold mb-1">
                                                    Violation Detected ({violationCount})
                                                </p>
                                                <p className="text-red-300 text-xs leading-relaxed">
                                                    {violationMsg}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto pt-6 border-t border-zinc-800">
                                    <button
                                        onClick={confirmAndSubmit}
                                        disabled={submitting}
                                        className="w-full px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 font-bold text-white transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                                    >
                                        {submitting ? "Submitting..." : "Submit Exam"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {phase === "submitted" && (
                    <div className="max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-3">
                        <h2 className="text-2xl font-bold text-white">Exam submitted</h2>
                        <p className="text-zinc-400 text-sm">Your answers have been saved. You may close this tab.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
