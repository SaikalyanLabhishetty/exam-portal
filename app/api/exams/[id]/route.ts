import { NextRequest, NextResponse } from "next/server"
import { getDb, toPublicId, ExamDocument } from "@/lib/mongodb"

type Params = { params: Promise<{ id: string }> }

// GET /api/exams/[id] - Get single exam
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params

        const db = await getDb()
        const examDoc = await db
            .collection<ExamDocument>("exams")
            .findOne({ uid: id })
        const exam = examDoc ? toPublicId(examDoc) : null

        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 })
        }

        const [organization, questions, studentCount, resultCount] =
            await Promise.all([
                db
                    .collection("organizations")
                    .findOne({ uid: exam.orgId }, { projection: { name: 1, code: 1 } }),
                db.collection("questions").find({ examId: id }).sort({ createdAt: 1 }).toArray(),
                db.collection("students").countDocuments({ examId: id }),
                db.collection("results").countDocuments({ examId: id }),
            ])

        return NextResponse.json({
            ...exam,
            organization,
            questions,
            _count: {
                students: studentCount,
                results: resultCount,
            },
        })
    } catch (error) {
        console.error("Error fetching exam:", error)
        return NextResponse.json(
            { error: "Failed to fetch exam" },
            { status: 500 }
        )
    }
}

// PUT /api/exams/[id] - Update exam
export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params
        const body = await request.json()
        const {
            name,
            duration,
            examDate,
            startTime,
            endTime,
            totalMarks,
            snapshotInterval,
            proctoringEnabled,
            questions,
        } = body

        const db = await getDb()
        await db.collection<ExamDocument>("exams").updateOne(
            { uid: id },
            {
                $set: {
                    ...(name && { name }),
                    ...(duration && { duration: parseInt(duration) }),
                    ...(examDate !== undefined && { examDate: examDate ? String(examDate) : null }),
                    ...(startTime !== undefined && { startTime: startTime ? String(startTime) : null }),
                    ...(endTime !== undefined && { endTime: endTime ? String(endTime) : null }),
                    ...(totalMarks && { totalMarks: parseInt(totalMarks) }),
                    ...(snapshotInterval && {
                        snapshotInterval: parseInt(snapshotInterval),
                    }),
                    ...(proctoringEnabled !== undefined && { proctoringEnabled }),
                    ...(questions && { questions }),
                    updatedAt: new Date(),
                },
            }
        )

        const updated = await db
            .collection<ExamDocument>("exams")
            .findOne({ uid: id })
        const exam = updated ? toPublicId(updated) : null
        if (!exam) {
            return NextResponse.json({ error: "Exam not found" }, { status: 404 })
        }

        const organization = await db
            .collection("organizations")
            .findOne({ uid: exam.orgId }, { projection: { name: 1, code: 1 } })

        return NextResponse.json({ ...exam, organization })
    } catch (error) {
        console.error("Error updating exam:", error)
        return NextResponse.json(
            { error: "Failed to update exam" },
            { status: 500 }
        )
    }
}

// DELETE /api/exams/[id] - Delete exam
export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params

        const db = await getDb()
        await db.collection<ExamDocument>("exams").deleteOne({ uid: id })
        await Promise.all([
            db.collection("questions").deleteMany({ examId: id }),
            db.collection("students").deleteMany({ examId: id }),
            db.collection("results").deleteMany({ examId: id }),
            db.collection("snapshots").deleteMany({ examId: id }),
            db.collection("faceData").deleteMany({ examId: id }),
            db.collection("answers").deleteMany({ examId: id }),
        ])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting exam:", error)
        return NextResponse.json(
            { error: "Failed to delete exam" },
            { status: 500 }
        )
    }
}
