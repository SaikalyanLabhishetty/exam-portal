import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { generateOrgCode } from "@/lib/utils"
import { getDb, toPublicIds, OrganizationDocument } from "@/lib/mongodb"

// GET /api/organizations - List all organizations
export async function GET() {
    try {
        const db = await getDb()
        const organizations = await db
            .collection<OrganizationDocument>("organizations")
            .find({})
            .sort({ createdAt: -1 })
            .toArray()

        const organizationIds = organizations.map(
            (org: OrganizationDocument) => org.uid
        )
        const examCounts = await db
            .collection("exams")
            .aggregate<{ _id: string; count: number }>([
                { $match: { orgId: { $in: organizationIds } } },
                { $group: { _id: "$orgId", count: { $sum: 1 } } },
            ])
            .toArray()

        const countsMap = new Map(
            examCounts.map((item: { _id: string; count: number }) => [
                item._id,
                item.count,
            ])
        )

        const payload = toPublicIds(organizations).map((org) => ({
            ...org,
            _count: {
                exams: countsMap.get(org.id) ?? 0,
            },
        }))

        return NextResponse.json(payload)
    } catch (error) {
        console.error("Error fetching organizations:", error)
        return NextResponse.json(
            { error: "Failed to fetch organizations" },
            { status: 500 }
        )
    }
}

// POST /api/organizations - Create organization
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name } = body

        if (!name || typeof name !== "string") {
            return NextResponse.json(
                { error: "Organization name is required" },
                { status: 400 }
            )
        }

        const db = await getDb()

        // Generate unique org code
        let code = generateOrgCode()
        let exists = await db
            .collection<OrganizationDocument>("organizations")
            .findOne({ code })
        while (exists) {
            code = generateOrgCode()
            exists = await db
                .collection<OrganizationDocument>("organizations")
                .findOne({ code })
        }

        const now = new Date()
        const organization: OrganizationDocument = {
            uid: randomUUID(),
            name,
            code,
            createdAt: now,
            updatedAt: now,
        }

        await db
            .collection<OrganizationDocument>("organizations")
            .insertOne(organization)

        return NextResponse.json(
            { id: organization.uid, name: organization.name, code: organization.code },
            { status: 201 }
        )
    } catch (error) {
        console.error("Error creating organization:", error)
        return NextResponse.json(
            { error: "Failed to create organization" },
            { status: 500 }
        )
    }
}
