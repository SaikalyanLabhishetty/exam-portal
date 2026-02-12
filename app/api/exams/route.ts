import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { generateExamCode } from "@/lib/utils"
import { auth } from "@/auth"
import {
    getDb,
    toPublicId,
    toPublicIds,
    ExamDocument,
    UserDocument,
} from "@/lib/mongodb"

// GET /api/exams - List all exams
export async function GET() {
    try {
        const session = await auth()
        const where: Record<string, string> = {}

        if (session?.user?.email) {
            const userEmail = session.user.email
            const user = await getDb().then((db) =>
                db
                    .collection<UserDocument>("users")
                    .findOne({ email: userEmail })
            )
            if (user?.orgId) {
                where.orgId = user.orgId
            }
        }

        const db = await getDb()
        const examDocs = await db
            .collection<ExamDocument>("exams")
            .find(where)
            .sort({ createdAt: -1 })
            .toArray()

        const orgIds = examDocs.map((exam: ExamDocument) => exam.orgId)
        const organizations = await db
            .collection<{ uid: string; name: string; code: string }>(
                "organizations"
            )
            .find({ uid: { $in: orgIds } })
            .project({ uid: 1, name: 1, code: 1 })
            .toArray()
        const orgMap = new Map(
            organizations.map((org) => [
                org.uid,
                { name: org.name, code: org.code },
            ])
        )

        const examIds = examDocs.map((exam: ExamDocument) => exam.uid)
        const studentCounts = await db
            .collection("students")
            .aggregate<{ _id: string; count: number }>([
                { $match: { examId: { $in: examIds } } },
                { $group: { _id: "$examId", count: { $sum: 1 } } },
            ])
            .toArray()

        const studentCountMap = new Map(
            studentCounts.map((item: { _id: string; count: number }) => [
                item._id,
                item.count,
            ])
        )

        const mappedExamDocs = toPublicIds(examDocs)
        const exams = mappedExamDocs.map((exam) => ({
            ...exam,
            organization: orgMap.get(exam.orgId) ?? null,
            _count: {
                questions: exam.questions?.length ?? 0,
                students: studentCountMap.get(exam.id) ?? 0,
            },
        }))

        return NextResponse.json(exams)
    } catch (error) {
        console.error("Error fetching exams:", error)
        return NextResponse.json(
            { error: "Failed to fetch exams" },
            { status: 500 }
        )
    }
}

// POST /api/exams - Create exam
    export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, duration, proctoringEnabled } = body

        if (!name || !duration) {
            return NextResponse.json(
                { error: "name and duration are required" },
                { status: 400 }
            )
        }

        const db = await getDb()
        const session = await auth()
        const userEmail = session?.user?.email
        const user = userEmail
            ? await db
                .collection<UserDocument>("users")
                .findOne({ email: userEmail })
            : null

        if (!user?.orgId) {
            return NextResponse.json(
                { error: "Organization not assigned" },
                { status: 400 }
            )
        }

        // Verify organization exists
        const org = await db
            .collection("organizations")
            .findOne({ uid: user.orgId })
        if (!org) {
            return NextResponse.json(
                { error: "Organization not found" },
                { status: 404 }
            )
        }

        // Generate unique exam code
        let examCode = generateExamCode()
        let exists = await db
            .collection<ExamDocument>("exams")
            .findOne({ examCode })
        while (exists) {
            examCode = generateExamCode()
            exists = await db
                .collection<ExamDocument>("exams")
                .findOne({ examCode })
        }

        const now = new Date()
        const examDoc: ExamDocument = {
            uid: randomUUID(),
            orgId: user.orgId,
            name,
            examCode,
            duration: parseInt(duration),
            totalMarks: 0,
            snapshotInterval: 30,
            proctoringEnabled: typeof proctoringEnabled === "boolean" ? proctoringEnabled : false,
            questions: [],
            createdAt: now,
            updatedAt: now,
        }

        await db.collection<ExamDocument>("exams").insertOne(examDoc)

        return NextResponse.json(
            {
                ...toPublicId(examDoc),
                organization: { name: org.name, code: org.code },
            },
            { status: 201 }
        )
    } catch (error) {
        console.error("Error creating exam:", error)
        return NextResponse.json(
            { error: "Failed to create exam" },
            { status: 500 }
        )
    }
}
