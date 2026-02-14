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
}

export async function POST(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params
        const body = (await request.json()) as AnswerPayload
        const { studentId, answers, warnings } = body

        if (!studentId || !Array.isArray(answers)) {
            return NextResponse.json({ error: "studentId and answers are required" }, { status: 400 })
        }

        if (warnings !== undefined && !Array.isArray(warnings)) {
            return NextResponse.json({ error: "warnings must be an array" }, { status: 400 })
        }

        const warningEntries = Array.isArray(warnings) ? warnings : []

        const db = await getDb()
        const exam = await db.collection("exams").findOne({ uid: id })
        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 })
        }

        await db.collection("answers").updateOne(
            { examId: id, studentId },
            {
                $set: {
                    examId: id,
                    studentId,
                    answers,
                    warnings: warningEntries,
                    warningCount: warningEntries.length,
                    submittedAt: new Date(),
                },
            },
            { upsert: true }
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error saving answers:", error)
        return NextResponse.json({ error: "Failed to save answers" }, { status: 500 })
    }
}
