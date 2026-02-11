import { NextRequest, NextResponse } from "next/server"
import {
    getDb,
    toPublicId,
    toPublicIds,
    OrganizationDocument,
} from "@/lib/mongodb"

type Params = { params: Promise<{ id: string }> }

// GET /api/organizations/[id] - Get single organization
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params

        const db = await getDb()
        const orgDoc = await db
            .collection<OrganizationDocument>("organizations")
            .findOne({ uid: id })
        const organization = orgDoc ? toPublicId(orgDoc) : null

        const exams = await db
            .collection<{ uid: string; _id?: string }>("exams")
            .find({ orgId: id })
            .sort({ createdAt: -1 })
            .toArray()
        const mappedExams = toPublicIds(exams)

        if (!organization) {
            return NextResponse.json(
                { error: "Organization not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ ...organization, exams: mappedExams })
    } catch (error) {
        console.error("Error fetching organization:", error)
        return NextResponse.json(
            { error: "Failed to fetch organization" },
            { status: 500 }
        )
    }
}

// PUT /api/organizations/[id] - Update organization
export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params
        const body = await request.json()
        const { name } = body

        if (!name || typeof name !== "string") {
            return NextResponse.json(
                { error: "Organization name is required" },
                { status: 400 }
            )
        }

        const db = await getDb()
        await db
            .collection<OrganizationDocument>("organizations")
            .updateOne(
                { uid: id },
                { $set: { name, updatedAt: new Date() } }
            )

        const updated = await db
            .collection<OrganizationDocument>("organizations")
            .findOne({ uid: id })

        return NextResponse.json(updated ? toPublicId(updated) : null)
    } catch (error) {
        console.error("Error updating organization:", error)
        return NextResponse.json(
            { error: "Failed to update organization" },
            { status: 500 }
        )
    }
}

// DELETE /api/organizations/[id] - Delete organization
export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const { id } = await params

        const db = await getDb()
        await db
            .collection<OrganizationDocument>("organizations")
            .deleteOne({ uid: id })

        await db.collection("exams").deleteMany({ orgId: id })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting organization:", error)
        return NextResponse.json(
            { error: "Failed to delete organization" },
            { status: 500 }
        )
    }
}
