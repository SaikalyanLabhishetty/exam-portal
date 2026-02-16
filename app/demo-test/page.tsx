"use client"

/* eslint-disable @next/next/no-img-element */
import Link from "next/link"
import { useMemo, useState } from "react"

type QuestionKind =
  | "mcq"
  | "multi_select"
  | "short_text"
  | "long_text"
  | "image_long_text"
  | "image_mcq"
  | "formula"
  | "true_false"
  | "graph_mcq"
  | "case_study"

type DemoQuestion = {
  id: string
  title: string
  kind: QuestionKind
  prompt: string
  options?: string[]
  imageSrc?: string
  imageAlt?: string
  helperText?: string
  placeholder?: string
}

type AnswerValue = string | string[]

const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    id: "q1-mcq",
    title: "Platform Basics",
    kind: "mcq",
    prompt: "Which feature most directly protects exam integrity in remote settings?",
    options: ["Live proctoring and tab-switch tracking", "Dark mode support", "PDF export", "Custom logo"],
  },
  {
    id: "q2-multi",
    title: "Capability Selection",
    kind: "multi_select",
    prompt: "Select all modules your institution would likely use in year one.",
    options: ["AI proctoring", "Question bank", "Auto-evaluation", "Result analytics", "SIS integration"],
    helperText: "This question demonstrates multi-select answers.",
  },
  {
    id: "q3-short",
    title: "Short Text Response",
    kind: "short_text",
    prompt: "In one sentence, describe your current exam bottleneck.",
    placeholder: "Example: Manual grading causes a two-week delay.",
  },
  {
    id: "q4-long",
    title: "Long Text / Essay",
    kind: "long_text",
    prompt: "Write a short policy note for students about fair-use of online exam systems.",
    placeholder: "Type a detailed paragraph here...",
  },
  {
    id: "q5-image-text",
    title: "Campus Safety Observation",
    kind: "image_long_text",
    prompt:
      "Schools often use map-style images in geography and civics exams. Based on this world map, suggest one question that tests regional understanding.",
    imageSrc:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/World_map_-_low_resolution.svg/1280px-World_map_-_low_resolution.svg.png",
    imageAlt: "World map used in geography assessments",
    placeholder: "Write a geography-style question and expected learning outcome.",
  },
  {
    id: "q6-image-mcq",
    title: "Science Diagram MCQ",
    kind: "image_mcq",
    prompt:
      "Science and engineering exams commonly use reference charts. From this periodic table image, which skill is being tested most directly?",
    imageSrc:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Periodic_table_large.svg/1280px-Periodic_table_large.svg.png",
    imageAlt: "Periodic table chart commonly used in school exams",
    options: ["Concept recall", "Color preference", "Typing speed", "Time-zone conversion"],
  },
  {
    id: "q7-formula",
    title: "Formula Input",
    kind: "formula",
    prompt: "Enter the simplified form of this expression.",
    helperText: "Expression: x^2 + 2x + 1 = (x + 1)^?",
    placeholder: "Enter your formula answer, for example: 2",
  },
  {
    id: "q8-true-false",
    title: "True / False",
    kind: "true_false",
    prompt: "A timed exam can auto-submit when the countdown reaches zero.",
    options: ["True", "False"],
  },
  {
    id: "q9-graph",
    title: "Graph Interpretation",
    kind: "graph_mcq",
    prompt: "Based on the line graph below, during which interval is the growth steepest?",
    options: ["Week 1 to Week 2", "Week 2 to Week 3", "Week 3 to Week 4", "Week 4 to Week 5"],
    helperText: "Graph questions like this are common in entrance tests, aptitude tests, and internal assessments.",
  },
  {
    id: "q10-case-study",
    title: "Case Study Response",
    kind: "case_study",
    prompt:
      "Your university runs 12,000 concurrent candidates across regions. Outline a rollout plan covering onboarding, proctoring policy, and post-exam analytics.",
    placeholder: "Write your implementation plan here...",
  },
]

const isAnswered = (question: DemoQuestion, value: AnswerValue | undefined) => {
  if (question.kind === "multi_select") {
    return Array.isArray(value) && value.length > 0
  }
  return typeof value === "string" && value.trim().length > 0
}

const getAnswerPreview = (value: AnswerValue | undefined) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "No answer"
  }
  return value && value.trim() ? value : "No answer"
}

export default function DemoTestPage() {
  const [hasStarted, setHasStarted] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})

  const currentQuestion = DEMO_QUESTIONS[currentIndex]

  const answeredCount = useMemo(
    () => DEMO_QUESTIONS.filter((question) => isAnswered(question, answers[question.id])).length,
    [answers]
  )

  const progressPercent = Math.round((answeredCount / DEMO_QUESTIONS.length) * 100)

  const setSingleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const setTextAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const toggleMultiSelect = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const existing = prev[questionId]
      const selected = Array.isArray(existing) ? existing : []
      const next = selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]
      return { ...prev, [questionId]: next }
    })
  }

  const restartDemo = () => {
    setHasStarted(false)
    setIsSubmitted(false)
    setCurrentIndex(0)
    setAnswers({})
  }

  const renderQuestionInput = (question: DemoQuestion) => {
    if (
      question.kind === "mcq" ||
      question.kind === "image_mcq" ||
      question.kind === "true_false" ||
      question.kind === "graph_mcq"
    ) {
      const selected = typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""
      return (
        <div className="space-y-3">
          {(question.options ?? []).map((option) => {
            const active = selected === option
            return (
              <button
                key={option}
                type="button"
                onClick={() => setSingleAnswer(question.id, option)}
                className={`w-full rounded-2xl border px-5 py-4 text-left transition-all ${
                  active
                    ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 text-zinc-700 dark:text-zinc-300 hover:border-blue-400/50"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`h-4 w-4 rounded-full border ${
                      active ? "border-blue-500 bg-blue-500" : "border-zinc-400 dark:border-zinc-600"
                    }`}
                  />
                  <span className="font-medium">{option}</span>
                </span>
              </button>
            )
          })}
        </div>
      )
    }

    if (question.kind === "multi_select") {
      const selected = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : []
      return (
        <div className="space-y-3">
          {(question.options ?? []).map((option) => {
            const active = selected.includes(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleMultiSelect(question.id, option)}
                className={`w-full rounded-2xl border px-5 py-4 text-left transition-all ${
                  active
                    ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-300"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 text-zinc-700 dark:text-zinc-300 hover:border-green-400/50"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`h-4 w-4 rounded border ${
                      active ? "border-green-500 bg-green-500" : "border-zinc-400 dark:border-zinc-600"
                    }`}
                  />
                  <span className="font-medium">{option}</span>
                </span>
              </button>
            )
          })}
        </div>
      )
    }

    if (question.kind === "short_text" || question.kind === "formula") {
      const value = typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""
      return (
        <input
          type="text"
          value={value}
          onChange={(event) => setTextAnswer(question.id, event.target.value)}
          placeholder={question.placeholder}
          className="w-full px-6 py-5 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all font-medium"
        />
      )
    }

    const value = typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""
    return (
      <textarea
        value={value}
        onChange={(event) => setTextAnswer(question.id, event.target.value)}
        placeholder={question.placeholder}
        rows={8}
        className="w-full px-8 py-6 bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 transition-all text-lg leading-relaxed shadow-inner"
      />
    )
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-300 px-6 py-12">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Public Demo Test</h1>
            <Link
              href="/"
              className="px-5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-black uppercase tracking-widest"
            >
              Back to Landing
            </Link>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
            <p className="text-[10px] font-black text-zinc-600 dark:text-zinc-500 uppercase tracking-[0.3em]">No Auth Required</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Try 10 Questions Instantly</h2>
            <p className="mt-4 max-w-3xl text-zinc-600 dark:text-zinc-400">
              This is a public demo exam. No login, no email, and no exam code are required.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">Exam</p>
                <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-200">Public Demo Assessment</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">Duration</p>
                <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-200">35 Minutes</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">Questions</p>
                <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-200">{DEMO_QUESTIONS.length}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">Audience</p>
                <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-200">School / College</p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setHasStarted(true)}
                className="h-12 px-8 bg-green-500 text-black font-black rounded-2xl hover:bg-green-400 hover:scale-105 active:scale-95 shadow-xl shadow-green-500/20 transition-all text-[10px] uppercase tracking-widest flex items-center gap-3"
              >
                Start Demo Exam
              </button>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-600">Public URL: /demo-test</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-300 px-6 py-12">
        <div className="mx-auto w-full max-w-5xl">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-green-600 dark:text-green-400">Demo Completed</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Submission Preview</h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              This screen helps clients validate that every question format can be collected and reviewed in one flow.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">Total Questions</p>
                <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-white">{DEMO_QUESTIONS.length}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">Answered</p>
                <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-white">{answeredCount}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">Completion</p>
                <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-white">{progressPercent}%</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {DEMO_QUESTIONS.map((question, index) => (
                <div key={question.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-600">Q{index + 1}</p>
                  <p className="mt-2 font-semibold text-zinc-800 dark:text-zinc-100">{question.title}</p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{getAnswerPreview(answers[question.id])}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={restartDemo}
                className="h-12 px-8 bg-green-500 text-black font-black rounded-2xl hover:bg-green-400 hover:scale-105 active:scale-95 shadow-xl shadow-green-500/20 transition-all text-[10px] uppercase tracking-widest flex items-center gap-3"
              >
                Restart Demo
              </button>
              <Link
                href="/"
                className="h-12 px-8 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-black rounded-2xl hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all uppercase tracking-widest text-[10px] flex items-center"
              >
                Back to Landing
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-300 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Exam<span className="text-blue-500">Portal</span>
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-600">
              Progress {answeredCount}/{DEMO_QUESTIONS.length}
            </p>
            <Link
              href="/"
              className="px-5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-black uppercase tracking-widest"
            >
              Back to Landing
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="px-6 py-5 md:px-10 md:py-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white/70 dark:bg-zinc-900/50">
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Public Demo Session</h2>
              <p className="text-zinc-600 dark:text-zinc-500 text-xs font-medium">
                10 questions • No auth required
              </p>
            </div>
            <div className="w-36 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row min-h-[680px]">
            <aside className="lg:w-72 bg-zinc-50 dark:bg-zinc-950/30 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/50">
                <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-widest">Question List</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {DEMO_QUESTIONS.map((question, index) => {
                  const active = currentIndex === index
                  const answered = isAnswered(question, answers[question.id])
                  return (
                    <button
                      key={question.id}
                      onClick={() => setCurrentIndex(index)}
                      className={`
                        w-full p-3 rounded-2xl text-left transition-all group relative overflow-hidden
                        ${active ? "bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-700/50" : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"}
                      `}
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <span
                          className={`
                            h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-black
                            ${active ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"}
                            ${!active && answered ? "border-b border-green-500/50" : "border-b border-zinc-300 dark:border-zinc-700"}
                          `}
                        >
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[11px] font-bold truncate ${active ? "text-zinc-900 dark:text-white" : "text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-400"}`}
                          >
                            {question.title}
                          </p>
                          <div className="flex gap-1 mt-0.5">
                            {answered ? (
                              <span className="text-[8px] font-black text-green-500 uppercase">Done</span>
                            ) : (
                              <span className="text-[8px] font-black text-zinc-500 uppercase">Pending</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-green-500 rounded-r-full shadow-[0_0_12px_rgba(34,197,94,0.4)]" />
                      )}
                    </button>
                  )
                })}
              </div>
            </aside>

            <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900/20">
              <div className="flex-1 overflow-y-auto p-6 md:p-12">
                <div className="max-w-3xl mx-auto space-y-10">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-[2rem] bg-zinc-200 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700/50 flex items-center justify-center text-xl font-black text-zinc-900 dark:text-white shadow-xl">
                      {currentIndex + 1}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                        {currentQuestion.title}
                      </h3>
                      <p className="text-zinc-600 dark:text-zinc-500 text-sm font-medium">Question {currentIndex + 1} of {DEMO_QUESTIONS.length}</p>
                    </div>
                  </div>

                  <div className="p-6 md:p-10 bg-white dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] space-y-8 shadow-2xl">
                    <div>
                      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] mb-4">Question Description</div>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight tracking-tight">
                        {currentQuestion.prompt}
                      </p>
                    </div>

                    {currentQuestion.helperText && (
                      <p className="rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-5 py-4 text-sm text-amber-700 dark:text-amber-200 font-medium">
                        {currentQuestion.helperText}
                      </p>
                    )}

                    {currentQuestion.kind === "formula" && (
                      <div className="rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-5 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700 dark:text-blue-200">
                          Formula Preview
                        </p>
                        <math xmlns="http://www.w3.org/1998/Math/MathML" className="mt-2 text-lg text-zinc-900 dark:text-white">
                          <mrow>
                            <mi>x</mi>
                            <mo>^</mo>
                            <mn>2</mn>
                            <mo>+</mo>
                            <mn>2</mn>
                            <mi>x</mi>
                            <mo>+</mo>
                            <mn>1</mn>
                            <mo>=</mo>
                            <msup>
                              <mrow>
                                <mo>(</mo>
                                <mi>x</mi>
                                <mo>+</mo>
                                <mn>1</mn>
                                <mo>)</mo>
                              </mrow>
                              <mi>n</mi>
                            </msup>
                          </mrow>
                        </math>
                      </div>
                    )}

                    {currentQuestion.kind === "graph_mcq" && (
                      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-5 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-200">
                          Graph Preview
                        </p>
                        <div className="mt-3 rounded-xl border border-indigo-200/70 dark:border-indigo-500/30 bg-white dark:bg-zinc-900 p-4">
                          <svg viewBox="0 0 360 180" className="h-40 w-full">
                            <line x1="30" y1="150" x2="340" y2="150" stroke="currentColor" className="text-zinc-400" />
                            <line x1="30" y1="20" x2="30" y2="150" stroke="currentColor" className="text-zinc-400" />
                            <polyline
                              points="30,140 95,125 160,100 225,95 290,70 340,35"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="text-indigo-500"
                            />
                            <circle cx="30" cy="140" r="4" className="fill-indigo-500" />
                            <circle cx="95" cy="125" r="4" className="fill-indigo-500" />
                            <circle cx="160" cy="100" r="4" className="fill-indigo-500" />
                            <circle cx="225" cy="95" r="4" className="fill-indigo-500" />
                            <circle cx="290" cy="70" r="4" className="fill-indigo-500" />
                            <circle cx="340" cy="35" r="4" className="fill-indigo-500" />
                            <text x="18" y="155" className="fill-zinc-500 text-[11px]">0</text>
                            <text x="74" y="168" className="fill-zinc-500 text-[10px]">W1</text>
                            <text x="140" y="168" className="fill-zinc-500 text-[10px]">W2</text>
                            <text x="205" y="168" className="fill-zinc-500 text-[10px]">W3</text>
                            <text x="270" y="168" className="fill-zinc-500 text-[10px]">W4</text>
                            <text x="325" y="168" className="fill-zinc-500 text-[10px]">W5</text>
                          </svg>
                        </div>
                      </div>
                    )}

                    {currentQuestion.imageSrc && (
                      <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/70 max-w-xl">
                        <img
                          src={currentQuestion.imageSrc}
                          alt={currentQuestion.imageAlt ?? "Question reference image"}
                          className="h-52 w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div>{renderQuestionInput(currentQuestion)}</div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 md:px-12 md:py-6 bg-zinc-50 dark:bg-zinc-950/80 border-t border-zinc-200 dark:border-zinc-800/50 backdrop-blur-xl">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                    disabled={currentIndex === 0}
                    className="h-12 px-8 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-black rounded-2xl hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-zinc-900 dark:disabled:hover:text-white uppercase tracking-widest text-[10px] flex items-center gap-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Previous
                  </button>

                  {currentIndex < DEMO_QUESTIONS.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, DEMO_QUESTIONS.length - 1))}
                      className="h-12 px-8 bg-white text-black font-black rounded-2xl hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-2xl border border-zinc-200"
                    >
                      Next Question
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsSubmitted(true)}
                      className="h-12 px-8 bg-green-500 text-black font-black rounded-2xl hover:bg-green-400 hover:scale-105 active:scale-95 shadow-xl shadow-green-500/20 transition-all text-[10px] uppercase tracking-widest flex items-center gap-3"
                    >
                      Submit Demo
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
