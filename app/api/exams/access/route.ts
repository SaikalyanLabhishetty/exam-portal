import { NextRequest, NextResponse } from "next/server"
import { ExamDocument, StudentDocument, getDb } from "@/lib/mongodb"

function escapeRegex(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

type AccessBody = {
    examId?: string
    examCode?: string
    studentEmail?: string
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as AccessBody
        const examId = body.examId?.trim()
        const examCode = body.examCode?.trim().toUpperCase()
        const studentEmail = body.studentEmail?.trim()

        if (!examId || !examCode || !studentEmail) {
            return NextResponse.json(
                { error: "examId, examCode and studentEmail are required" },
                { status: 400 }
            )
        }

        const db = await getDb()
        const exam = await db.collection<ExamDocument>("exams").findOne({ uid: examId })

        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 })
        }

        if (exam.examCode !== examCode) {
            return NextResponse.json({ error: "Invalid exam code" }, { status: 401 })
        }

        const student = await db.collection<StudentDocument>("students").findOne({
            orgId: exam.orgId,
            emailId: { $regex: `^${escapeRegex(studentEmail)}$`, $options: "i" },
        })

        if (!student) {
            return NextResponse.json(
                { error: "Student email is not registered for this organization" },
                { status: 403 }
            )
        }

        return NextResponse.json({
            exam: {
                id: exam.uid,
                name: exam.name,
                duration: exam.duration,
                totalMarks: exam.totalMarks,
                proctoringEnabled: exam.proctoringEnabled,
                _count: { questions: exam.questions?.length ?? 0 },
            },
            student: {
                id: student.uid,
                name: student.name,
                emailId: student.emailId,
            },
            questions: (exam.questions ?? []).map((question) => ({
                question: question.question,
                questionType: question.questionType,
                options: question.options ?? [],
            })),
        })
    } catch (error) {
        console.error("Error validating exam access:", error)
        return NextResponse.json(
            { error: "Failed to validate exam access" },
            { status: 500 }
        )
    }
}
