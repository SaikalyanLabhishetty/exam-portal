import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getDb, UserDocument } from "@/lib/mongodb"

type Params = { params: Promise<{ id: string }> }

// DELETE /api/students/[id] - Delete a student
export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params
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

        // Ensure the student belongs to the organization
        const result = await db.collection("students").deleteOne({
            uid: id,
            orgId: user.orgId,
        })

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: "Student not found or unauthorized" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting student:", error)
        return NextResponse.json(
            { error: "Failed to delete student" },
            { status: 500 }
        )
    }
}

// PUT /api/students/[id] - Update a student
export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params
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

        const body = await request.json()
        const { name, rollNo, emailId, phoneNumber, section, year } = body

        const result = await db.collection("students").updateOne(
            { uid: id, orgId: user.orgId },
            {
                $set: {
                    ...(name && { name }),
                    ...(rollNo && { rollNo }),
                    ...(emailId && { emailId }),
                    ...(phoneNumber !== undefined && { phoneNumber }),
                    ...(section !== undefined && { section }),
                    ...(year !== undefined && { year }),
                    updatedAt: new Date(),
                },
            }
        )

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: "Student not found or unauthorized" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error updating student:", error)
        return NextResponse.json(
            { error: "Failed to update student" },
            { status: 500 }
        )
    }
}
