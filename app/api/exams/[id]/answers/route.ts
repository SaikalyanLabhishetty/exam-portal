import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"

type Params = { params: Promise<{ id: string }> }

type WarningPayload = {
    reason: string
    message: string
    at: string
}

type AnswerPayload = {
    studentId?: string
    answers?: { questionIndex: number; answer: string }[]
    warnings?: WarningPayload[]
    status?: "pending" | "completed"
    currentIndex?: number
}

export async function POST(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params
        const body = (await request.json()) as AnswerPayload
        const { studentId, answers, warnings, status, currentIndex } = body

        if (!studentId || !Array.isArray(answers)) {
            return NextResponse.json({ error: "studentId and answers are required" }, { status: 400 })
        }

        if (warnings !== undefined && !Array.isArray(warnings)) {
            return NextResponse.json({ error: "warnings must be an array" }, { status: 400 })
        }

        if (status !== undefined && status !== "pending" && status !== "completed") {
            return NextResponse.json({ error: "status must be pending or completed" }, { status: 400 })
        }

        const warningEntries = Array.isArray(warnings) ? warnings : []
        const attemptStatus = status ?? "completed"

        const db = await getDb()
        const exam = await db.collection("exams").findOne({ uid: id })
        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 })
        }

        const existingAttempt = await db.collection("answers").findOne({ examId: id, studentId })
        const existingStatus =
            existingAttempt?.status === "completed" || existingAttempt?.status === "pending"
                ? existingAttempt.status
                : existingAttempt?.submittedAt
                  ? "completed"
                  : null
        if (existingStatus === "completed" && attemptStatus !== "completed") {
            return NextResponse.json({ error: "Exam already submitted." }, { status: 409 })
        }

        const now = new Date()
        const updateResult = await db.collection("answers").findOneAndUpdate(
            { examId: id, studentId },
            {
                $set: {
                    examId: id,
                    studentId,
                    answers,
                    warnings: warningEntries,
                    warningCount: warningEntries.length,
                    status: attemptStatus,
                    ...(typeof currentIndex === "number" ? { currentIndex } : {}),
                    lastSavedAt: now,
                    ...(attemptStatus === "completed" ? { submittedAt: now } : {}),
                },
                $setOnInsert: {
                    startedAt: now,
                },
            },
            { upsert: true, returnDocument: "after" }
        )

        return NextResponse.json({
            success: true,
            status: updateResult.value?.status ?? attemptStatus,
            startedAt: updateResult.value?.startedAt ?? null,
        })
    } catch (error) {
        console.error("Error saving answers:", error)
        return NextResponse.json({ error: "Failed to save answers" }, { status: 500 })
    }
}
