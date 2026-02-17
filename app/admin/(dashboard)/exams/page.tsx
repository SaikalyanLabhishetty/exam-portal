"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"

type QuestionType = "text" | "option" | "multi_select" | "formula"

interface Question {
    question: string
    questionType: QuestionType
    answer: string
    options?: string[]
    imageSrc?: string
}

interface Exam {
    id: string
    name: string
    examCode: string
    duration: number
    examDate?: string | null
    startTime?: string | null
    endTime?: string | null
    totalMarks: number
    proctoringEnabled: boolean
    createdAt: string
    organization: { name: string; code: string }
    _count: { questions: number; students: number }
    questions?: Question[]
}

type MathfieldElement = HTMLElement & {
    value: string
    focus: () => void
    insert?: (value: string) => void
}

type MathVirtualKeyboard = {
    show: () => void
    hide: () => void
    layouts?: string[]
}

const FORMULA_KEYBOARD_LAYOUTS = ["numeric", "symbols", "alphabetic"]

const FORMULA_INSERT_SNIPPETS = [
    { label: "Fraction", latex: "\\frac{a}{b}" },
    { label: "Power", latex: "x^{2}" },
    { label: "Root", latex: "\\sqrt{x}" },
    { label: "Subscript", latex: "x_{i}" },
    { label: "Pi", latex: "\\pi" },
    { label: "Theta", latex: "\\theta" },
]

export default function ExamsPage() {
    const [exams, setExams] = useState<Exam[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showQuestionModal, setShowQuestionModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [savingQuestions, setSavingQuestions] = useState(false)
    const [form, setForm] = useState({
        name: "",
        duration: "60",
        examDate: "",
        startTime: "",
        endTime: "",
        proctoringEnabled: false,
    })
    const [activeExam, setActiveExam] = useState<Exam | null>(null)
    const [stagedQuestions, setStagedQuestions] = useState<Question[]>([])
    const [questionForm, setQuestionForm] = useState({
        question: "",
        questionType: "text" as QuestionType,
        answer: "",
        optionsCount: 4,
        options: ["", "", "", ""],
        imageSrc: "",
    })
    const [viewIndex, setViewIndex] = useState(0)
    const [isAnimating, setIsAnimating] = useState(false)
    const [origin, setOrigin] = useState("")
    const [copiedExamId, setCopiedExamId] = useState<string | null>(null)
    const [isMathLiveLoaded, setIsMathLiveLoaded] = useState(false)
    const [isMathKeyboardVisible, setIsMathKeyboardVisible] = useState(false)
    const [activeMathInput, setActiveMathInput] = useState<"question" | "answer">("question")
    const questionMathFieldRef = useRef<MathfieldElement | null>(null)
    const answerMathFieldRef = useRef<MathfieldElement | null>(null)

    const resetQuestionForm = (questionType: QuestionType = "text") => {
        setQuestionForm({
            question: "",
            questionType,
            answer: "",
            optionsCount: 4,
            options: ["", "", "", ""],
            imageSrc: "",
        })
        setActiveMathInput("question")
    }

    const fetchExams = async () => {
        try {
            const res = await fetch("/api/exams")
            const data = await res.json()
            setExams(data)
        } catch (error) {
            console.error("Error fetching exams:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchExams()
    }, [])

    useEffect(() => {
        if (typeof window !== "undefined") {
            setOrigin(window.location.origin)
        }
    }, [])

    const existingQuestionCount = activeExam?.questions?.length || 0
    const isNewQuestionSlot = showQuestionModal && viewIndex === existingQuestionCount + stagedQuestions.length
    const isFormulaType = questionForm.questionType === "formula"

    const getMathKeyboard = () =>
        (window as Window & { mathVirtualKeyboard?: MathVirtualKeyboard }).mathVirtualKeyboard

    useEffect(() => {
        if (!isMathLiveLoaded) return
        const field = questionMathFieldRef.current
        if (!field) return
        if (field.value !== questionForm.question) {
            field.value = questionForm.question
        }
    }, [isMathLiveLoaded, questionForm.question])

    useEffect(() => {
        if (!isMathLiveLoaded || !isFormulaType) return
        const field = answerMathFieldRef.current
        if (!field) return
        if (field.value !== questionForm.answer) {
            field.value = questionForm.answer
        }
    }, [isMathLiveLoaded, isFormulaType, questionForm.answer])

    useEffect(() => {
        if (!isMathLiveLoaded) return
        const keyboard = getMathKeyboard()
        if (!keyboard) return

        if (!isNewQuestionSlot || !isFormulaType) {
            keyboard.hide()
            setIsMathKeyboardVisible(false)
            return
        }

        setIsMathKeyboardVisible(true)
        questionMathFieldRef.current?.focus()
    }, [isMathLiveLoaded, isNewQuestionSlot, isFormulaType])

    useEffect(() => {
        if (!isMathLiveLoaded) return
        const keyboard = getMathKeyboard()
        if (!keyboard) return
        if (!isNewQuestionSlot || !isFormulaType) {
            keyboard.hide()
            return
        }

        keyboard.layouts = FORMULA_KEYBOARD_LAYOUTS
        if (isMathKeyboardVisible) {
            keyboard.show()
        } else {
            keyboard.hide()
        }
    }, [isMathLiveLoaded, isNewQuestionSlot, isFormulaType, isMathKeyboardVisible])

    useEffect(() => {
        if (!isMathLiveLoaded) return

        const keyboard = getMathKeyboard()
        if (!keyboard) return

        return () => keyboard.hide()
    }, [isMathLiveLoaded])

    const toggleMathKeyboard = () => {
        if (!isFormulaType) return
        setIsMathKeyboardVisible((prev) => {
            const next = !prev
            if (next) {
                if (activeMathInput === "answer") {
                    answerMathFieldRef.current?.focus()
                } else {
                    questionMathFieldRef.current?.focus()
                }
            }
            return next
        })
    }

    const insertFormulaSnippet = (latex: string) => {
        const targetField =
            activeMathInput === "answer" ? answerMathFieldRef.current : questionMathFieldRef.current
        if (!targetField) return

        if (typeof targetField.insert === "function") {
            targetField.insert(latex)
        } else {
            targetField.value = `${targetField.value ?? ""}${latex}`
        }

        const nextValue = targetField.value ?? ""
        if (activeMathInput === "answer") {
            setQuestionForm((prev) => ({ ...prev, answer: nextValue }))
        } else {
            setQuestionForm((prev) => ({ ...prev, question: nextValue }))
        }

        targetField.focus()
    }

    const getExamUrl = (examId: string) => {
        const path = `/exam/${examId}`
        return origin ? `${origin}${path}` : path
    }

    const handleCopyExamUrl = async (examId: string) => {
        const examUrl = getExamUrl(examId)
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(examUrl)
            } else {
                const textArea = document.createElement("textarea")
                textArea.value = examUrl
                textArea.style.position = "fixed"
                textArea.style.left = "-9999px"
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()
                document.execCommand("copy")
                document.body.removeChild(textArea)
            }

            setCopiedExamId(examId)
            setTimeout(() => {
                setCopiedExamId((current) => (current === examId ? null : current))
            }, 1500)
        } catch (error) {
            console.error("Error copying exam URL:", error)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        try {
            const res = await fetch("/api/exams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            if (res.ok) {
                setForm({
                    name: "",
                    duration: "60",
                    examDate: "",
                    startTime: "",
                    endTime: "",
                    proctoringEnabled: false,
                })
                setShowModal(false)
                fetchExams()
            }
        } catch (error) {
            console.error("Error creating exam:", error)
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this exam?")) return
        try {
            await fetch(`/api/exams/${id}`, { method: "DELETE" })
            fetchExams()
        } catch (error) {
            console.error("Error deleting exam:", error)
        }
    }

    const openQuestionModal = (exam: Exam) => {
        setActiveExam(exam)
        resetQuestionForm("text")
        setStagedQuestions([])
        setViewIndex(0) // Start at the first question (existing or new)
        setShowQuestionModal(true)
    }

    const handleOptionCountChange = (value: number) => {
        const count = Math.max(2, Math.min(6, value))
        setQuestionForm((prev) => ({
            ...prev,
            optionsCount: count,
            options: Array.from({ length: count }, (_, index) => prev.options[index] || ""),
        }))
    }

    const handleOptionChange = (index: number, value: string) => {
        setQuestionForm((prev) => {
            const next = [...prev.options]
            next[index] = value
            return { ...prev, options: next }
        })
    }

    const buildQuestionFromForm = (): Question | null => {
        const trimmedQuestion = questionForm.question.trim()
        const trimmedAnswer = questionForm.answer.trim()
        const trimmedImageSrc = questionForm.imageSrc.trim()

        let trimmedOptions: string[] | undefined
        if (questionForm.questionType === "option" || questionForm.questionType === "multi_select") {
            trimmedOptions = questionForm.options.map((option) => option.trim()).filter(Boolean)
        }

        if (!trimmedQuestion || !trimmedAnswer) {
            return null
        }

        if ((questionForm.questionType === "option" || questionForm.questionType === "multi_select") && (!trimmedOptions || trimmedOptions.length < 2)) {
            return null
        }

        return {
            question: trimmedQuestion,
            questionType: questionForm.questionType,
            answer: trimmedAnswer,
            options: trimmedOptions,
            imageSrc: trimmedImageSrc || undefined,
        }
    }

    const isQuestionValid = Boolean(buildQuestionFromForm())

    const handleNext = () => {
        const existingCount = activeExam?.questions?.length || 0
        const stagedCount = stagedQuestions.length

        // If we are on the blank new question form (the very end)
        if (viewIndex === existingCount + stagedCount) {
            const newQuestion = buildQuestionFromForm()
            if (!newQuestion) return

            setIsAnimating(true)
            setTimeout(() => {
                setStagedQuestions((prev) => [...prev, newQuestion])
                resetQuestionForm(questionForm.questionType)
                setViewIndex((prev) => prev + 1)
                setIsAnimating(false)
            }, 300)
        } else {
            // Just moving forward through existing/staged
            setIsAnimating(true)
            setTimeout(() => {
                setViewIndex((prev) => prev + 1)
                setIsAnimating(false)
            }, 300)
        }
    }

    const handlePrev = () => {
        if (viewIndex > 0) {
            setIsAnimating(true)
            setTimeout(() => {
                setViewIndex((prev) => prev - 1)
                setIsAnimating(false)
            }, 300)
        }
    }

    const handleRemoveStagedQuestion = (index: number) => {
        setStagedQuestions((prev) => prev.filter((_, idx) => idx !== index))
    }

    const handleSaveQuestions = async () => {
        if (!activeExam) return
        if (stagedQuestions.length === 0) return

        setSavingQuestions(true)
        try {
            const existingQuestions = activeExam.questions || []
            const updatedQuestions = [...existingQuestions, ...stagedQuestions]

            const res = await fetch(`/api/exams/${activeExam.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questions: updatedQuestions }),
            })

            if (res.ok) {
                setShowQuestionModal(false)
                setActiveExam(null)
                setStagedQuestions([])
                resetQuestionForm("text")
                fetchExams()
            }
        } catch (error) {
            console.error("Error saving question:", error)
        } finally {
            setSavingQuestions(false)
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Exams</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
                >
                    + Create Exam
                </button>
            </div>

            {loading ? (
                <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
            ) : exams.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
                    <p className="text-zinc-600 dark:text-zinc-400">No exams yet. Create your first one!</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-zinc-100 dark:bg-zinc-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-600 dark:text-zinc-300">Name</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-600 dark:text-zinc-300">Code</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-600 dark:text-zinc-300">Organization</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-600 dark:text-zinc-300">Duration</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-600 dark:text-zinc-300">Questions</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-600 dark:text-zinc-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {exams.map((exam) => (
                                <tr key={exam.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                    <td className="px-6 py-4 text-zinc-900 dark:text-white font-medium">{exam.name}</td>
                                    <td className="px-6 py-4">
                                        <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-green-600 dark:text-green-400 text-sm border border-zinc-200 dark:border-zinc-800">
                                            {exam.examCode}
                                        </code>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{exam.organization.name}</td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{exam.duration} min</td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{exam._count.questions}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handleCopyExamUrl(exam.id)}
                                                className={copiedExamId === exam.id
                                                    ? "text-green-600 dark:text-green-400"
                                                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                                }
                                                title={copiedExamId === exam.id ? "Copied exam URL" : "Copy exam URL"}
                                            >
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M9 12.75A2.25 2.25 0 0111.25 10.5h7.5A2.25 2.25 0 0121 12.75v7.5a2.25 2.25 0 01-2.25 2.25h-7.5A2.25 2.25 0 019 20.25v-7.5z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M15 10.5V8.25A2.25 2.25 0 0012.75 6h-7.5A2.25 2.25 0 003 8.25v7.5A2.25 2.25 0 005.25 18H7.5"
                                                    />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openQuestionModal(exam)}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                                                title="Edit questions"
                                            >
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M19.5 7.125L16.875 4.5"
                                                    />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(exam.id)}
                                                className="text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300"
                                                title="Delete"
                                            >
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={1.5}
                                                        d="M19.5 7.5l-.867 12.142A2.25 2.25 0 0116.39 21H7.61a2.25 2.25 0 01-2.243-1.358L4.5 7.5m3 0V5.25A2.25 2.25 0 019.75 3h4.5A2.25 2.25 0 0116.5 5.25V7.5m-9 0h9"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Create Exam</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Exam name"
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                required
                            />
                            <input
                                type="number"
                                value={form.duration}
                                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                                placeholder="Duration (min)"
                                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                required
                            />
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Exam date (optional)</label>
                                <input
                                    type="date"
                                    value={form.examDate}
                                    onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Exam time (optional)</label>
                                <div className="flex gap-3">
                                    <input
                                        type="time"
                                        value={form.startTime}
                                        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                        aria-label="Exam start time"
                                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                    <input
                                        type="time"
                                        value={form.endTime}
                                        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                        aria-label="Exam end time"
                                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Proctoring</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Enable webcam checks for this exam.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, proctoringEnabled: !prev.proctoringEnabled }))}
                                    className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${form.proctoringEnabled ? "bg-green-500" : "bg-zinc-400 dark:bg-zinc-600"}`}
                                    aria-pressed={form.proctoringEnabled}
                                    aria-label="Toggle proctoring"
                                >
                                    <span
                                        className={`w-5 h-5 bg-white rounded-full transform transition-transform ${form.proctoringEnabled ? "translate-x-5" : "translate-x-0"}`}
                                    />
                                </button>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl disabled:opacity-50"
                                >
                                    {creating ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showQuestionModal && activeExam && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[min(90vh,850px)]">
                        {/* Modal Header */}
                        <div className="px-10 py-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white/70 dark:bg-zinc-900/50">
                            <div>
                                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                                    Exam Editor
                                </h2>
                                <p className="text-zinc-600 dark:text-zinc-500 text-xs font-medium">
                                    {activeExam.name} • {(activeExam.questions?.length || 0) + stagedQuestions.length} Questions Total
                                </p>
                            </div>
                            <button
                                onClick={() => setShowQuestionModal(false)}
                                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-all text-zinc-500 hover:text-zinc-900 dark:hover:text-white group"
                            >
                                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* LHS Sidebar Navigation */}
                            <div className="w-72 bg-zinc-50 dark:bg-zinc-950/30 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
                                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/50">
                                    <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-widest">Question List</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                    {Array.from({ length: (activeExam.questions?.length || 0) + stagedQuestions.length + 1 }).map((_, idx) => {
                                        const isExisting = idx < (activeExam.questions?.length || 0)
                                        const isStaged = !isExisting && idx < (activeExam.questions?.length || 0) + stagedQuestions.length
                                        const isActive = idx === viewIndex

                                        const qText = isExisting
                                            ? activeExam.questions![idx].question
                                            : isStaged
                                                ? stagedQuestions[idx - (activeExam.questions?.length || 0)].question
                                                : "New Question Slot"

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setIsAnimating(true)
                                                    setTimeout(() => {
                                                        setViewIndex(idx)
                                                        setIsAnimating(false)
                                                    }, 300)
                                                }}
                                                className={`
                                                    w-full p-3 rounded-2xl text-left transition-all group relative overflow-hidden
                                                    ${isActive ? "bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-700/50" : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"}
                                                `}
                                            >
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <span className={`
                                                        h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-black
                                                        ${isActive ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"}
                                                        ${!isActive && isExisting ? "border-b border-green-500/50" : ""}
                                                        ${!isActive && isStaged ? "border-b border-blue-500/50" : ""}
                                                    `}>
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-[11px] font-bold truncate ${isActive ? "text-zinc-900 dark:text-white" : "text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-400"}`}>
                                                            {qText}
                                                        </p>
                                                        <div className="flex gap-1 mt-0.5">
                                                            {isExisting && <span className="text-[8px] font-black text-green-500 uppercase">Live</span>}
                                                            {isStaged && <span className="text-[8px] font-black text-blue-500 uppercase">Draft</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isActive && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-green-500 rounded-r-full shadow-[0_0_12px_rgba(34,197,94,0.4)]" />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900/20">
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
                                    <div className={`transition-all duration-500 ${isAnimating ? "opacity-0 scale-98 translate-x-4" : "opacity-100 scale-100 translate-x-0"}`}>
                                        {(() => {
                                            const existingCount = activeExam.questions?.length || 0
                                            const stagedCount = stagedQuestions.length
                                            const isExisting = viewIndex < existingCount
                                            const isStaged = !isExisting && viewIndex < existingCount + stagedCount
                                            const isNew = viewIndex === existingCount + stagedCount

                                            const currentQuestion = isExisting
                                                ? activeExam.questions![viewIndex]
                                                : isStaged
                                                    ? stagedQuestions[viewIndex - existingCount]
                                                    : null

                                            return (
                                                <div className="max-w-3xl mx-auto space-y-12">
                                                    <div className="flex items-center gap-6">
                                                        <div className="h-16 w-16 rounded-[2rem] bg-zinc-200 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700/50 flex items-center justify-center text-xl font-black text-zinc-900 dark:text-white shadow-xl">
                                                            {viewIndex + 1}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                                                                {isExisting ? "Published Question" : isStaged ? "Staged Draft" : "Add New Question"}
                                                            </h3>
                                                            <p className="text-zinc-600 dark:text-zinc-500 text-sm font-medium">Sequential Editor • Step {viewIndex + 1}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-10">
                                                        {isNew ? (
                                                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                <div className="space-y-4">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Question Content</label>
                                                                        {isFormulaType && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={toggleMathKeyboard}
                                                                                className={`
                                                                                    h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                                                                                    ${isMathKeyboardVisible
                                                                                        ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/20"
                                                                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                                                    }
                                                                                `}
                                                                                title="Toggle Math Keyboard"
                                                                            >
                                                                                Keyboard
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <div className="relative group">
                                                                        {isFormulaType && isMathLiveLoaded ? (
                                                                            <math-field
                                                                                ref={questionMathFieldRef}
                                                                                default-mode="math"
                                                                                smart-mode
                                                                                multiline
                                                                                placeholder="Enter the question text here..."
                                                                                onFocus={() => {
                                                                                    setActiveMathInput("question")
                                                                                    setIsMathKeyboardVisible(true)
                                                                                }}
                                                                                onInput={(event) => {
                                                                                    const target = event.target as MathfieldElement
                                                                                    setQuestionForm((prev) => ({ ...prev, question: target.value ?? "" }))
                                                                                }}
                                                                                className="block w-full min-h-[12rem] px-8 py-6 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all text-xl leading-relaxed shadow-inner"
                                                                            />
                                                                        ) : (
                                                                            <textarea
                                                                                value={questionForm.question}
                                                                                onChange={(e) => setQuestionForm((p) => ({ ...p, question: e.target.value }))}
                                                                                rows={5}
                                                                                className="w-full px-8 py-6 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all text-xl leading-relaxed shadow-inner"
                                                                                placeholder="Enter the question text here..."
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    {isFormulaType && isMathLiveLoaded && (
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {FORMULA_INSERT_SNIPPETS.map((snippet) => (
                                                                                <button
                                                                                    key={snippet.label}
                                                                                    type="button"
                                                                                    onClick={() => insertFormulaSnippet(snippet.latex)}
                                                                                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                                                >
                                                                                    {snippet.label}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Image URL (Optional)</label>
                                                                    <input
                                                                        type="url"
                                                                        value={questionForm.imageSrc}
                                                                        onChange={(e) => setQuestionForm(p => ({ ...p, imageSrc: e.target.value }))}
                                                                        className="w-full px-6 py-4 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all font-medium"
                                                                        placeholder="https://example.com/image.png"
                                                                    />
                                                                </div>

                                                                <div className="grid md:grid-cols-2 gap-10">
                                                                    <div className="space-y-4">
                                                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Type</label>
                                                                        <select
                                                                            value={questionForm.questionType}
                                                                            onChange={(e) =>
                                                                                setQuestionForm((p) => ({
                                                                                    ...p,
                                                                                    questionType: e.target.value as QuestionType,
                                                                                }))
                                                                            }
                                                                            className="w-full px-6 py-5 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all appearance-none cursor-pointer font-bold"
                                                                        >
                                                                            <option value="text">Subjective (Text)</option>
                                                                            <option value="formula">Formula</option>
                                                                            <option value="option">Multiple Choice</option>
                                                                            <option value="multi_select">Multi-Select</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Key Solution</label>
                                                                        {isFormulaType && isMathLiveLoaded ? (
                                                                            <math-field
                                                                                ref={answerMathFieldRef}
                                                                                default-mode="math"
                                                                                smart-mode
                                                                                placeholder="Correct formula answer"
                                                                                onFocus={() => {
                                                                                    setActiveMathInput("answer")
                                                                                    setIsMathKeyboardVisible(true)
                                                                                }}
                                                                                onInput={(event) => {
                                                                                    const target = event.target as MathfieldElement
                                                                                    setQuestionForm((prev) => ({ ...prev, answer: target.value ?? "" }))
                                                                                }}
                                                                                className="block w-full min-h-[56px] px-6 py-4 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all font-bold"
                                                                            />
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                value={questionForm.answer}
                                                                                onChange={(e) => setQuestionForm(p => ({ ...p, answer: e.target.value }))}
                                                                                className="w-full px-6 py-5 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all font-bold"
                                                                                placeholder="Correct answer"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {(questionForm.questionType === "option" || questionForm.questionType === "multi_select") && (
                                                                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                                                        <div className="flex items-center justify-between px-2">
                                                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Multiple Choice Options</label>
                                                                            <div className="flex items-center gap-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-2xl">
                                                                                <span className="text-[9px] font-black text-zinc-600">COUNT</span>
                                                                                <input
                                                                                    type="number" min={2} max={6}
                                                                                    value={questionForm.optionsCount}
                                                                                    onChange={(e) => handleOptionCountChange(Number(e.target.value))}
                                                                                    className="w-8 bg-transparent text-sm text-center font-black text-green-600 dark:text-green-500 outline-none"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="grid sm:grid-cols-2 gap-4">
                                                                            {questionForm.options.map((option, idx) => (
                                                                                <div key={idx} className="relative group/opt">
                                                                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-500 dark:text-zinc-700 group-focus-within/opt:text-green-500">
                                                                                        {String.fromCharCode(65 + idx)}
                                                                                    </span>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={option}
                                                                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                                                        className="w-full pl-12 pr-6 py-5 bg-white dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800/50 rounded-2xl text-zinc-900 dark:text-white text-sm placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition-all font-medium"
                                                                                        placeholder={`Choice ${idx + 1}`}
                                                                                    />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                                                                <div className="p-10 bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] space-y-10 shadow-2xl">
                                                                    <div>
                                                                        <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-6">Question Description</div>
                                                                        <p className="text-3xl font-bold text-zinc-900 dark:text-white leading-tight tracking-tight italic">
                                                                            &quot;{currentQuestion?.question}&quot;
                                                                        </p>
                                                                        {currentQuestion?.imageSrc && (
                                                                            <div className="mt-6 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                                                                                <img src={currentQuestion.imageSrc} alt="Question" className="w-full h-auto max-h-64 object-contain bg-zinc-100 dark:bg-zinc-900" />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="grid sm:grid-cols-2 gap-10">
                                                                        <div className="space-y-4">
                                                                            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Format</div>
                                                                            <div className="px-6 py-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-700 dark:text-zinc-300 font-black text-sm uppercase tracking-widest inline-block shadow-lg">
                                                                                {currentQuestion?.questionType}
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-4">
                                                                            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Correct Logic</div>
                                                                            <div className="px-6 py-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-600 dark:text-green-400 font-black text-sm inline-block shadow-lg">
                                                                                {currentQuestion?.answer}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {currentQuestion?.options && currentQuestion.options.length > 0 && (
                                                                        <div className="space-y-6">
                                                                            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Possible Options</div>
                                                                            <div className="grid sm:grid-cols-2 gap-4">
                                                                                {currentQuestion.options.map((opt, oidx) => (
                                                                                    <div key={oidx} className="flex items-center gap-5 px-8 py-5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 rounded-[1.5rem] group hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all shadow-md">
                                                                                        <span className="h-8 w-8 rounded-xl bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] font-black text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-all group-hover:scale-110">
                                                                                            {String.fromCharCode(65 + oidx)}
                                                                                        </span>
                                                                                        <span className="text-sm text-zinc-700 dark:text-zinc-400 font-bold tracking-tight">{opt}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {isStaged && (
                                                                        <div className="pt-10 border-t border-zinc-200 dark:border-zinc-800/50 flex justify-end">
                                                                            <button
                                                                                onClick={() => handleRemoveStagedQuestion(viewIndex - (activeExam.questions?.length || 0))}
                                                                                className="px-8 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-red-500/20"
                                                                            >
                                                                                Remove Draft
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                    </div>
                                </div>

                                {/* Compact Navigation Footer */}
                                <div className="px-12 py-6 bg-zinc-50 dark:bg-zinc-950/80 border-t border-zinc-200 dark:border-zinc-800/50 backdrop-blur-xl">
                                    <div className="max-w-3xl mx-auto flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={handlePrev}
                                            disabled={viewIndex === 0 || isAnimating}
                                            className="h-12 px-8 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-black rounded-2xl hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-zinc-900 dark:disabled:hover:text-white uppercase tracking-widest text-[10px] flex items-center gap-3"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                            Previous
                                        </button>

                                        <div className="flex gap-4">
                                            {stagedQuestions.length > 0 && viewIndex === (activeExam.questions?.length || 0) + stagedQuestions.length && (
                                                <button
                                                    type="button"
                                                    onClick={handleSaveQuestions}
                                                    disabled={savingQuestions || isAnimating}
                                                    className="h-12 px-8 bg-zinc-900 dark:bg-zinc-800 text-white font-black rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-all text-[10px] uppercase tracking-widest border border-zinc-800 dark:border-zinc-700 shadow-xl"
                                                >
                                                    {savingQuestions ? "Saving..." : `Save ${stagedQuestions.length} Questions`}
                                                </button>
                                            )}

                                            {(() => {
                                                const isEndOfList = viewIndex === (activeExam.questions?.length || 0) + stagedQuestions.length

                                                if (!isEndOfList) {
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={handleNext}
                                                            disabled={isAnimating}
                                                            className="h-12 px-8 bg-zinc-900 dark:bg-zinc-800 text-white font-black rounded-2xl hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-all text-[10px] uppercase tracking-widest border border-zinc-800 dark:border-zinc-700 shadow-xl"
                                                        >
                                                            Next Question
                                                        </button>
                                                    )
                                                }

                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={handleNext}
                                                        disabled={!isQuestionValid || isAnimating}
                                                        className="h-12 px-8 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest shadow-xl shadow-green-500/20 active:scale-95 disabled:bg-zinc-400 disabled:dark:bg-zinc-700 disabled:text-zinc-200 disabled:shadow-none"
                                                    >
                                                        Save To Draft
                                                    </button>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <Script
                src="https://unpkg.com/mathlive@0.108.3/mathlive.min.js"
                onLoad={() => setIsMathLiveLoaded(true)}
            />
        </div>
    )
}
