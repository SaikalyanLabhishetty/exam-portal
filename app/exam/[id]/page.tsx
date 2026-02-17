"use client"

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Script from "next/script"

type ExamQuestion = {
    question: string
    questionType: "text" | "option" | "multi_select" | "formula"
    options: string[]
    imageSrc?: string
}

type AttemptStatus = "pending" | "completed"

type AttemptInfo = {
    status: AttemptStatus
    startedAt: string | null
    answers: { questionIndex: number; answer: string }[]
    warnings: WarningEvent[]
    currentIndex: number
    remainingSeconds: number | null
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
    attempt: AttemptInfo | null
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

type ConfirmationModalState = {
    mode: "manual-submit" | "focus-loss-submit"
    title: string
    message: string
    reason?: string
}

const ESC_LONG_PRESS_MS = 700
const WARNING_SPEECH_COOLDOWN_MS = 2500

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
    const [attempt, setAttempt] = useState<AttemptInfo | null>(null)
    const [isMathLiveLoaded, setIsMathLiveLoaded] = useState(false)
    const [confirmationModal, setConfirmationModal] = useState<ConfirmationModalState | null>(null)
    const lastViolationRef = useRef<{ reason: string; at: number }>({ reason: "", at: 0 })
    const isReEnteringFullscreenRef = useRef(false)
    const escapePressRef = useRef<EscapePressState>(createInitialEscapePressState())
    const fullscreenRecoveryRef = useRef<FullscreenRecoveryState>(null)
    const fullscreenRetryTimerRef = useRef<number | null>(null)
    const progressSaveTimerRef = useRef<number | null>(null)
    const answersRef = useRef<Record<number, string>>({})
    const warningsRef = useRef<WarningEvent[]>([])
    const currentIndexRef = useRef(0)
    const submittingRef = useRef(false)
    const focusLossConfirmationRef = useRef(false)
    const lastWarningSpeechRef = useRef<{ message: string; at: number }>({ message: "", at: 0 })

    const totalSeconds = useMemo(() => (accessData ? accessData.exam.duration * 60 : null), [accessData])
    const answeredCount = useMemo(() => Object.keys(answers).length, [answers])
    const totalQuestions = accessData?.questions.length ?? 0
    const progressPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0
    const currentQuestion = accessData?.questions[currentIndex]
    const isFormulaQuestion = currentQuestion?.questionType === "formula"

    const buildAnswerEntries = (answerState: Record<number, string>) =>
        Object.entries(answerState).map(([questionIndex, answer]) => ({
            questionIndex: Number(questionIndex),
            answer,
        }))

    const toAnswerMap = (answerEntries: { questionIndex: number; answer: string }[]) =>
        answerEntries.reduce<Record<number, string>>((acc, entry) => {
            acc[entry.questionIndex] = entry.answer
            return acc
        }, {})

    const computeRemainingSeconds = (startedAt: string | null, total: number) => {
        if (!startedAt) return total
        const startedAtMs = new Date(startedAt).getTime()
        if (Number.isNaN(startedAtMs)) return total
        const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000)
        return Math.max(total - elapsedSeconds, 0)
    }

    const speakWarningAlert = useCallback((reason: string, fallbackMessage: string) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return

        const speechText = (() => {
            if (reason === "escape-click") {
                return "You pressed Escape. This counts as a warning."
            }
            if (reason.startsWith("escape-hold")) {
                return "Long press Escape detected. This counts as a warning."
            }
            if (reason === "tab-switch" || reason === "window-blur") {
                return "App switch detected. This counts as a warning."
            }
            if (reason.includes("fullscreen-exit")) {
                return "Fullscreen exit detected. This counts as a warning."
            }
            return fallbackMessage
        })()

        const now = Date.now()
        const lastSpoken = lastWarningSpeechRef.current
        if (lastSpoken.message === speechText && now - lastSpoken.at < WARNING_SPEECH_COOLDOWN_MS) {
            return
        }

        try {
            const synth = window.speechSynthesis
            synth.cancel()
            const utterance = new SpeechSynthesisUtterance(speechText)
            utterance.rate = 1
            utterance.pitch = 1
            synth.speak(utterance)
            lastWarningSpeechRef.current = { message: speechText, at: now }
        } catch (error) {
            console.warn("Unable to play warning speech:", error)
        }
    }, [])

    const handleSubmitAccess = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!examId) return

        setLoading(true)
        setError("")
        setPhase("access")
        setAccessData(null)
        setAttempt(null)
        setAnswers({})
        setCurrentIndex(0)
        setTimeLeft(null)
        setViolationCount(0)
        setViolationMsg("")
        setWarnings([])

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

            const nextAttempt = data.attempt ?? null
            setAccessData(data)
            setAttempt(nextAttempt)
            if (nextAttempt?.status === "pending") {
                const questionTotal = data.questions?.length ?? 0
                const savedAnswers = toAnswerMap(nextAttempt.answers ?? [])
                setAnswers(savedAnswers)
                const nextIndex =
                    typeof nextAttempt.currentIndex === "number"
                        ? Math.min(Math.max(nextAttempt.currentIndex, 0), Math.max(questionTotal - 1, 0))
                        : 0
                setCurrentIndex(nextIndex)
            } else {
                setAnswers({})
                setCurrentIndex(0)
            }
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

    const recordViolation = useCallback((reason: string, message: string, cooldownMs = 1500) => {
        const now = Date.now()
        const last = lastViolationRef.current
        if (now - last.at < cooldownMs) {
            setViolationMsg(message)
            speakWarningAlert(reason, message)
            return
        }
        lastViolationRef.current = { reason, at: now }
        setViolationCount((prev) => prev + 1)
        setViolationMsg(message)
        setWarnings((prev) => [...prev, { reason, message, at: new Date(now).toISOString() }])
        speakWarningAlert(reason, message)
    }, [speakWarningAlert])

    const lockExamKeyboard = async () => {
        const keyboard = (navigator as NavigatorWithKeyboardLock).keyboard
        if (!keyboard?.lock) return
        try {
            await keyboard.lock()
        } catch (err) {
            console.warn("Keyboard lock unavailable:", err)
        }
    }

    const unlockExamKeyboard = () => {
        const keyboard = (navigator as NavigatorWithKeyboardLock).keyboard
        if (!keyboard?.unlock) return
        keyboard.unlock()
    }

    const startOrResumeAttempt = async (nextIndex: number) => {
        if (!accessData) return null
        const payload = {
            studentId: accessData.student.id,
            answers: buildAnswerEntries(answers),
            warnings,
            status: "pending" as const,
            currentIndex: nextIndex,
        }
        const res = await fetch(`/api/exams/${accessData.exam.id}/answers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error || "Failed to start exam session.")
        }

        const data = await res.json().catch(() => ({}))
        return data
    }

    const handleStartExam = async () => {
        if (!accessData) return
        setStartError("")
        const nextIndex =
            attempt?.status === "pending"
                ? Math.min(Math.max(attempt.currentIndex ?? 0, 0), Math.max(accessData.questions.length - 1, 0))
                : 0

        try {
            await requestFullscreen()
            await lockExamKeyboard()
        } catch (err) {
            console.error("Fullscreen error:", err)
            setStartError("Please allow fullscreen to start the exam.")
            return
        }

        let startResponse: { startedAt?: string } | null = null
        try {
            startResponse = await startOrResumeAttempt(nextIndex)
        } catch (err) {
            console.error("Start exam error:", err)
            const message = err instanceof Error ? err.message : "Unable to start the exam."
            setStartError(message)
            unlockExamKeyboard()
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { })
            }
            return
        }

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
        focusLossConfirmationRef.current = false
        setConfirmationModal(null)
        setPhase("exam")
        const total = accessData.exam.duration * 60
        const startedAt =
            typeof startResponse?.startedAt === "string"
                ? startResponse.startedAt
                : attempt?.startedAt ?? null
        const remainingSeconds =
            startedAt !== null
                ? computeRemainingSeconds(startedAt, total)
                : typeof attempt?.remainingSeconds === "number"
                    ? attempt.remainingSeconds
                    : total
        setTimeLeft(remainingSeconds)
        setCurrentIndex(nextIndex)
        setAttempt((prev) => ({
            status: "pending",
            startedAt: startedAt,
            answers: prev?.answers ?? [],
            currentIndex: nextIndex,
            remainingSeconds: null,
        }))
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
        answersRef.current = answers
    }, [answers])

    useEffect(() => {
        warningsRef.current = warnings
    }, [warnings])

    useEffect(() => {
        currentIndexRef.current = currentIndex
    }, [currentIndex])

    useEffect(() => {
        submittingRef.current = submitting
    }, [submitting])

    useEffect(() => {
        if (phase !== "exam") {
            focusLossConfirmationRef.current = false
            setConfirmationModal(null)
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel()
            }
        }
    }, [phase])

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

        const openFocusLossConfirmation = (reason: string, message: string) => {
            if (focusLossConfirmationRef.current) return
            if (submittingRef.current) return

            focusLossConfirmationRef.current = true
            speakWarningAlert(reason, message)

            setConfirmationModal({
                mode: "focus-loss-submit",
                title: "App Switch Detected",
                message,
                reason,
            })
        }

        const blockContext = (e: Event) => e.preventDefault()
        const blockKeys = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase()
            const blockedPlainKeys = ["escape"]
            const isFunctionKey = /^f\d{1,2}$/.test(key)
            const isModifierShortcut = e.ctrlKey || e.metaKey || e.altKey

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
                isFunctionKey ||
                isModifierShortcut
            ) {
                e.preventDefault()
                e.stopPropagation()
            }
        }
        const blockClipboard = (e: ClipboardEvent) => {
            e.preventDefault()
            e.stopPropagation()
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
                openFocusLossConfirmation(
                    "tab-switch",
                    "You switched away from the exam. Submit now, or continue the exam."
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
                openFocusLossConfirmation(
                    "window-blur",
                    "Exam window lost focus. Submit now, or continue the exam."
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
        document.addEventListener("copy", blockClipboard, true)
        document.addEventListener("cut", blockClipboard, true)
        document.addEventListener("paste", blockClipboard, true)
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
            document.removeEventListener("copy", blockClipboard, true)
            document.removeEventListener("cut", blockClipboard, true)
            document.removeEventListener("paste", blockClipboard, true)
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
    }, [phase, accessData, recordViolation, speakWarningAlert])

    useEffect(() => {
        if (phase === "exam" && timeLeft === 0) {
            handleSubmitAnswers()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft, phase])

    useEffect(() => {
        if (phase !== "exam" || !accessData || submitting) return

        if (progressSaveTimerRef.current !== null) {
            window.clearTimeout(progressSaveTimerRef.current)
        }

        progressSaveTimerRef.current = window.setTimeout(() => {
            const payload = {
                studentId: accessData.student.id,
                answers: buildAnswerEntries(answers),
                warnings,
                status: "pending" as const,
                currentIndex,
            }
            fetch(`/api/exams/${accessData.exam.id}/answers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }).catch((err) => {
                console.error("Auto-save error:", err)
            })
        }, 600)

        return () => {
            if (progressSaveTimerRef.current !== null) {
                window.clearTimeout(progressSaveTimerRef.current)
                progressSaveTimerRef.current = null
            }
        }
    }, [phase, accessData, submitting, answers, currentIndex, warnings])

    const handleAnswerChange = (index: number, value: string) => {
        setAnswers((prev) => ({ ...prev, [index]: value }))
    }

    const handleMultiSelectChange = (index: number, value: string) => {
        setAnswers((prev) => {
            const currentStr = prev[index] || "[]"
            let current: string[] = []
            try {
                current = JSON.parse(currentStr)
                if (!Array.isArray(current)) current = []
            } catch {
                current = []
            }

            const next = current.includes(value)
                ? current.filter((v) => v !== value)
                : [...current, value]
            return { ...prev, [index]: JSON.stringify(next) }
        })
    }

    const handleSubmitAnswers = async (options?: { warningEvent?: WarningEvent; successMessage?: string }) => {
        if (!accessData || submittingRef.current) return
        submittingRef.current = true
        setSubmitting(true)
        setSubmitMsg("")

        const warningEvent = options?.warningEvent
        if (warningEvent) {
            setViolationCount((prev) => prev + 1)
            setViolationMsg(warningEvent.message)
            setWarnings((prev) => [...prev, warningEvent])
        }

        try {
            const warningPayload = warningEvent
                ? [...warningsRef.current, warningEvent]
                : warningsRef.current
            const payload = {
                studentId: accessData.student.id,
                answers: buildAnswerEntries(answersRef.current),
                warnings: warningPayload,
                status: "completed" as const,
                currentIndex: currentIndexRef.current,
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
                setSubmitMsg(options?.successMessage || "Answers saved. You may close the exam.")
                setPhase("submitted")
                setAttempt((prev) =>
                    prev
                        ? {
                            ...prev,
                            status: "completed",
                        }
                        : prev
                )
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
            submittingRef.current = false
        }
    }

    const confirmAndSubmit = () => {
        if (submitting) return
        setConfirmationModal({
            mode: "manual-submit",
            title: "Submit Exam",
            message: "Submit the exam now? You cannot change answers after submission.",
        })
    }

    const closeConfirmationModal = () => {
        if (submittingRef.current) return
        focusLossConfirmationRef.current = false
        setConfirmationModal(null)
    }

    const confirmSubmissionFromModal = () => {
        if (!confirmationModal || submittingRef.current) return

        const activeModal = confirmationModal
        setConfirmationModal(null)
        focusLossConfirmationRef.current = false

        if (activeModal.mode === "focus-loss-submit") {
            const warningEvent: WarningEvent = {
                reason: activeModal.reason || "focus-loss-submit",
                message: activeModal.message,
                at: new Date().toISOString(),
            }

            void handleSubmitAnswers({
                warningEvent,
                successMessage: "Exam submitted after app switch confirmation.",
            })
            return
        }

        void handleSubmitAnswers()
    }

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return "--:--"
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    }

    const questionCount = accessData?.questions.length ?? 0
    const isLastQuestion = questionCount > 0 && currentIndex === questionCount - 1
    const resumeRemainingSeconds =
        attempt?.status === "pending" && totalSeconds
            ? typeof attempt.remainingSeconds === "number"
                ? attempt.remainingSeconds
                : computeRemainingSeconds(attempt.startedAt, totalSeconds)
            : null

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
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-blue-500/30">
            {/* Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Access and Overview Phases */}
            {(phase === "access" || phase === "overview" || phase === "submitted") && (
                <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-radial-[at_center_center] from-zinc-900 via-zinc-950 to-zinc-950">
                    <div className="mb-12 text-center space-y-4">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
                            Exam<span className="text-blue-500">Portal</span>
                        </h1>
                        <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full" />
                    </div>

                    {phase === "access" && (
                        <div className="max-w-lg w-full bg-zinc-900/50 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl space-y-8">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-black tracking-tight text-white uppercase tracking-widest">Identify Yourself</h2>
                                <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Secure Access Control</p>
                            </div>

                            <form onSubmit={handleSubmitAccess} className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Student Email</label>
                                    <input
                                        type="email"
                                        value={studentEmail}
                                        onChange={(event) => setStudentEmail(event.target.value)}
                                        placeholder="name@university.edu"
                                        className="w-full px-6 py-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium"
                                        required
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Exam Access Code</label>
                                    <input
                                        type="text"
                                        value={examCode}
                                        onChange={(event) => setExamCode(event.target.value.toUpperCase())}
                                        placeholder="EXAM-XXXX"
                                        className="w-full px-6 py-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl text-white placeholder-zinc-700 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold tracking-widest"
                                        required
                                    />
                                </div>

                                {error ? (
                                    <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-shake">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        <p className="text-sm text-red-400 font-bold">{error}</p>
                                    </div>
                                ) : null}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full px-6 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] active:scale-95"
                                >
                                    {loading ? "Authenticating..." : "Initialize Session"}
                                </button>
                            </form>
                        </div>
                    )}

                    {phase === "overview" && accessData && (
                        <div className="max-w-2xl w-full space-y-6">
                            <div className="bg-zinc-900/50 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8">
                                    <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-widest">
                                        Verified
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Assessment Title</span>
                                        <h2 className="text-4xl font-black tracking-tight text-white">{accessData.exam.name}</h2>
                                    </div>

                                    <div className="flex flex-wrap gap-4">
                                        <div className="px-6 py-4 bg-zinc-950/50 rounded-2xl border border-zinc-800 flex flex-col">
                                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Duration</span>
                                            <span className="text-xl font-bold">{accessData.exam.duration}m</span>
                                        </div>
                                        <div className="px-6 py-4 bg-zinc-950/50 rounded-2xl border border-zinc-800 flex flex-col">
                                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Items</span>
                                            <span className="text-xl font-bold">{accessData.exam._count.questions}</span>
                                        </div>
                                        <div className="px-6 py-4 bg-zinc-950/50 rounded-2xl border border-zinc-800 flex flex-col">
                                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Status</span>
                                            <span className="text-xl font-bold text-green-500">READY</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {attempt?.status === "pending" && (
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex items-center justify-between gap-6 backdrop-blur-xl">
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-amber-500 uppercase tracking-widest">Saved Session Found</p>
                                        <p className="text-sm text-amber-200/70 font-medium italic">
                                            Continuing from Item #{(attempt.currentIndex ?? 0) + 1} • {formatTime(resumeRemainingSeconds)} left.
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 flex items-center justify-center animate-pulse">
                                        <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                </div>
                            )}

                            <div className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] p-10 space-y-6 backdrop-blur-md">
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest italic">Security Directives</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        "Biometric Tracking Active",
                                        "Zero-Latency Fullscreen Engaged",
                                        "Anti-Injection Environment",
                                        "Automated Proctoring Enabled"
                                    ].map((text, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm text-zinc-300 font-medium">
                                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                                            {text}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {startError && (
                                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                                    <p className="text-sm text-red-300 font-bold">{startError}</p>
                                </div>
                            )}

                            <button
                                onClick={handleStartExam}
                                className="w-full px-10 py-5 rounded-2xl bg-white text-zinc-950 font-black uppercase tracking-[0.2em] text-sm hover:bg-zinc-200 transition-all shadow-[0_30px_60px_-15px_rgba(255,255,255,0.15)] active:scale-95"
                            >
                                {attempt?.status === "pending" ? "Resume Secure Session" : "Initialize Secure Session"}
                            </button>
                        </div>
                    )}

                    {phase === "submitted" && (
                        <div className="max-w-md w-full bg-zinc-900/50 border border-white/5 rounded-[3rem] p-12 text-center space-y-8 backdrop-blur-3xl shadow-2xl">
                            <div className="w-24 h-24 bg-green-500/10 border border-green-500/20 rounded-full mx-auto flex items-center justify-center">
                                <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-3xl font-black tracking-tight text-white uppercase italic">Assessment Sealed</h2>
                                <p className="text-zinc-500 font-medium leading-relaxed">
                                    Your response has been securely encrypted and transmitted. You may now close this portal.
                                </p>
                                {submitMsg && (
                                    <p className="text-xs font-semibold text-amber-300/80 uppercase tracking-widest">
                                        {submitMsg}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {phase === "exam" && accessData && (
                <div className="flex h-screen overflow-hidden">
                    {/* LHS SIDEBAR - The laptop UI style */}
                    <aside className="w-80 bg-zinc-950/80 border-r border-white/10 flex flex-col relative z-20 backdrop-blur-xl">
                        {/* Sidebar Header */}
                        <div className="p-8 border-b border-white/5">
                            <h1 className="text-xl font-black tracking-tighter italic mb-8">
                                Exam<span className="text-blue-500">Portal</span>
                            </h1>

                            <div className="space-y-6">
                                <div className="p-5 bg-zinc-900/50 rounded-3xl border border-white/5 shadow-inner">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Time Dimension</span>
                                        <span className={`text-4xl font-black font-mono tracking-tighter ${timeLeft && timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-zinc-100'}`}>
                                            {formatTime(timeLeft)}
                                        </span>
                                    </div>
                                    <div className="mt-4 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 transition-all duration-1000"
                                            style={{ width: `${(timeLeft ?? 0) / (accessData.exam.duration * 60) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="px-2 space-y-1">
                                    <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                        <span>Items Completed</span>
                                        <span>{progressPercentage.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Nav Grid */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            <div>
                                <h3 className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mb-6 ml-1 italic">Structural Map</h3>
                                <div className="grid grid-cols-5 gap-3">
                                    {accessData.questions.map((_, idx) => {
                                        const isCurrent = idx === currentIndex
                                        const isAnswered = answers[idx] !== undefined && answers[idx] !== ""

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentIndex(idx)}
                                                className={`
                                                    h-10 w-10 rounded-xl flex items-center justify-center text-[11px] font-black transition-all
                                                    ${isCurrent ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-110 z-10' :
                                                        isAnswered ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                            'bg-zinc-900/50 text-zinc-600 border border-white/5 hover:bg-zinc-800'}
                                                `}
                                            >
                                                {idx + 1}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {violationCount > 0 && (
                                <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-3xl space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Violation Log</span>
                                    </div>
                                    <p className="text-[11px] text-red-300/60 font-medium leading-relaxed italic">
                                        {violationMsg}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Sidebar Footer */}
                        <div className="p-8 border-t border-white/5 bg-zinc-950/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
                                    <span className="text-xl font-black text-zinc-500">{accessData.student.name.charAt(0)}</span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-black text-zinc-200 truncate">{accessData.student.name}</span>
                                    <span className="text-[10px] font-bold text-zinc-600 tracking-wider truncate uppercase">{accessData.student.rollNo || "ID UNKNOWN"}</span>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* MAIN CONTENT AREA */}
                    <main className="flex-1 relative flex flex-col overflow-hidden bg-radial-[at_center_center] from-zinc-900 via-zinc-950 to-zinc-950">
                        {/* Floating elements */}
                        <div className="absolute inset-0 pointer-events-none opacity-20">
                            <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
                            <div className="absolute bottom-[20%] left-[5%] w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
                        </div>

                        {/* Question Viewport */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-12 lg:p-24 relative z-10">
                            <div className="max-w-4xl mx-auto space-y-16">
                                {/* Question Header */}
                                <div className="flex items-center gap-8">
                                    <div className="h-20 w-20 shrink-0 rounded-[2.5rem] bg-zinc-900 border-2 border-white/5 flex items-center justify-center text-4xl font-black text-white italic shadow-2xl">
                                        {currentIndex + 1}
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-black text-zinc-600 uppercase tracking-[0.4em] italic">Current Segment</span>
                                        {isFormulaQuestion && isMathLiveLoaded ? (
                                            <div className="mt-2 rounded-[2rem] border-2 border-white/5 bg-zinc-900/50 px-6 py-4">
                                                <math-field
                                                    key={`formula-question-${currentIndex}`}
                                                    value={currentQuestion?.question ?? ""}
                                                    read-only
                                                    default-mode="math"
                                                    className="block pointer-events-none bg-transparent border-0 p-0 text-4xl lg:text-5xl leading-tight"
                                                />
                                            </div>
                                        ) : (
                                            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter leading-tight italic">
                                                {currentQuestion?.question}
                                            </h2>
                                        )}
                                        {currentQuestion?.imageSrc && (
                                            <div className="pt-8">
                                                <img
                                                    src={currentQuestion.imageSrc}
                                                    alt="Question Reference"
                                                    className="rounded-[2rem] border-2 border-white/5 max-h-[400px] object-contain bg-zinc-900/50"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Response Interaction Area */}
                                <div className="pl-28">
                                    {currentQuestion?.questionType === "option" && currentQuestion.options.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-4">
                                            {currentQuestion.options.map((option, idx) => {
                                                const value = String.fromCharCode(65 + idx)
                                                const isSelected = answers[currentIndex] === value

                                                return (
                                                    <button
                                                        key={`${option}-${idx}`}
                                                        onClick={() => handleAnswerChange(currentIndex, value)}
                                                        className={`
                                                            group flex items-center gap-6 p-6 rounded-[2rem] border-2 text-left transition-all duration-300
                                                            ${isSelected ? 'bg-blue-600/10 border-blue-600/50 shadow-[0_20px_40px_-10px_rgba(37,99,235,0.2)]' :
                                                                'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-800/50'}
                                                        `}
                                                    >
                                                        <div className={`
                                                            h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center text-lg font-black transition-all
                                                            ${isSelected ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]' : 'bg-zinc-950 text-zinc-600 group-hover:text-zinc-400'}
                                                        `}>
                                                            {value}
                                                        </div>
                                                        <span className={`text-xl font-bold transition-colors ${isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                                                            {option}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    ) : currentQuestion?.questionType === "multi_select" && currentQuestion.options.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-4">
                                            {currentQuestion.options.map((option, idx) => {
                                                const value = String.fromCharCode(65 + idx)
                                                let selectedArray: string[] = []
                                                try {
                                                    selectedArray = JSON.parse(answers[currentIndex] || "[]")
                                                } catch { selectedArray = [] }
                                                const isSelected = selectedArray.includes(value)

                                                return (
                                                    <button
                                                        key={`${option}-${idx}`}
                                                        onClick={() => handleMultiSelectChange(currentIndex, value)}
                                                        className={`
                                                            group flex items-center gap-6 p-6 rounded-[2rem] border-2 text-left transition-all duration-300
                                                            ${isSelected ? 'bg-green-600/10 border-green-600/50 shadow-[0_20px_40px_-10px_rgba(34,197,94,0.2)]' :
                                                                'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-800/50'}
                                                        `}
                                                    >
                                                        <div className={`
                                                            h-12 w-12 shrink-0 rounded-lg flex items-center justify-center text-lg font-black transition-all
                                                            ${isSelected ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-zinc-950 text-zinc-600 group-hover:text-zinc-400'}
                                                        `}>
                                                            {isSelected ? "✓" : value}
                                                        </div>
                                                        <span className={`text-xl font-bold transition-colors ${isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                                                            {option}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2 italic">
                                                Detailed Analysis Response
                                            </div>
                                            <div className="relative group">
                                                <div className="absolute inset-0 bg-blue-500/5 blur-2xl rounded-[3rem] opacity-0 group-focus-within:opacity-100 transition-opacity" />
                                                <textarea
                                                    value={answers[currentIndex] ?? ""}
                                                    onChange={(e) => handleAnswerChange(currentIndex, e.target.value)}
                                                    placeholder="Synthesize your response here..."
                                                    className="w-full relative z-10 min-h-[300px] px-10 py-8 bg-zinc-900/60 backdrop-blur-3xl border-2 border-white/5 rounded-[3rem] text-2xl font-medium text-white placeholder-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 transition-all leading-relaxed italic shadow-inner selection:bg-blue-600"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Navigation Control Bar */}
                        <div className="px-12 py-8 bg-zinc-950/80 border-t border-white/5 relative z-20 backdrop-blur-xl">
                            <div className="max-w-4xl mx-auto flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                                    disabled={currentIndex === 0}
                                    className="h-14 px-10 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 font-black uppercase tracking-widest text-xs flex items-center gap-3 transition-all active:scale-95 disabled:opacity-20 disabled:scale-100"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Previous
                                </button>

                                <div className="flex gap-4">
                                    {isLastQuestion ? (
                                        <button
                                            onClick={confirmAndSubmit}
                                            disabled={submitting}
                                            className="h-14 px-10 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest text-xs shadow-[0_20px_40px_-10px_rgba(34,197,94,0.4)] transition-all active:scale-95 flex items-center gap-3"
                                        >
                                            {submitting ? "Processing..." : "Submit Assessment"}
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questionCount - 1))}
                                            className="h-14 px-12 rounded-2xl bg-white text-zinc-950 font-black uppercase tracking-widest text-xs shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] transition-all active:scale-95 flex items-center gap-3"
                                        >
                                            Next Item
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </main>

                    {confirmationModal && (
                        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
                            <div className="w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-[2rem] p-8 md:p-10 shadow-2xl space-y-6">
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em]">
                                        Confirmation Modal
                                    </p>
                                    <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                                        {confirmationModal.title}
                                    </h3>
                                    <p className="text-sm md:text-base text-zinc-300 leading-relaxed">
                                        {confirmationModal.message}
                                    </p>
                                    {confirmationModal.mode === "focus-loss-submit" && (
                                        <p className="text-[11px] font-semibold text-amber-300/80 uppercase tracking-widest">
                                            App switch detected during secure exam mode.
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={closeConfirmationModal}
                                        disabled={submitting}
                                        className="h-12 px-6 rounded-2xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-40"
                                    >
                                        Continue Exam
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmSubmissionFromModal}
                                        disabled={submitting}
                                        className="h-12 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white transition-all font-black uppercase tracking-widest text-[10px] shadow-[0_12px_30px_-8px_rgba(220,38,38,0.45)] disabled:opacity-40"
                                    >
                                        {submitting ? "Submitting..." : "Submit Exam"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <Script
                src="https://unpkg.com/mathlive@0.108.3/mathlive.min.js"
                onLoad={() => setIsMathLiveLoaded(true)}
            />
        </div>
    )
}
