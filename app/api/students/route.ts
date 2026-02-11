import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { auth } from "@/auth"
import {
    getDb,
    toPublicIds,
    toPublicId,
    StudentDocument,
    UserDocument,
} from "@/lib/mongodb"

// GET /api/students - List all students in the organization
export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        const db = await getDb()

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await db
            .collection<UserDocument>("users")
            .findOne({ email: session.user.email })

        if (!user?.orgId) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 })
        }

        const students = await db
            .collection<StudentDocument>("students")
            .find({ orgId: user.orgId })
            .sort({ createdAt: -1 })
            .toArray()

        return NextResponse.json(toPublicIds(students))
    } catch (error) {
        console.error("Error fetching students:", error)
        return NextResponse.json(
            { error: "Failed to fetch students" },
            { status: 500 }
        )
    }
}

// POST /api/students - Create a new student
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        const db = await getDb()

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await db
            .collection<UserDocument>("users")
            .findOne({ email: session.user.email })

        if (!user?.orgId) {
            return NextResponse.json({ error: "Organization not assigned" }, { status: 400 })
        }

        const body = await request.json()
        const { name, rollNo, emailId, phoneNumber, section, year } = body

        if (!name || !rollNo || !emailId || !year) {
            return NextResponse.json(
                { error: "Name, Roll No, Email ID, and Year are required" },
                { status: 400 }
            )
        }

        const now = new Date()
        const studentDoc: StudentDocument = {
            uid: randomUUID(),
            orgId: user.orgId,
            name,
            rollNo,
            emailId,
            phoneNumber: phoneNumber || "",
            section: section || "",
            year: year || "",
            createdAt: now,
            updatedAt: now,
        }

        await db.collection<StudentDocument>("students").insertOne(studentDoc)

        return NextResponse.json(toPublicId(studentDoc), { status: 201 })
    } catch (error) {
        console.error("Error creating student:", error)
        return NextResponse.json(
            { error: "Failed to create student" },
            { status: 500 }
        )
    }
}
