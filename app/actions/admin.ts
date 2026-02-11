"use server"

import { randomUUID } from "crypto"
import bcrypt from "bcryptjs"
import { generateOrgCode } from "@/lib/utils"
import {
    getDb,
    OrganizationDocument,
    UserDocument,
} from "@/lib/mongodb"

export async function createAdmin(formData: FormData) {
    console.log(">>> [createAdmin] Action started")
    try {
        const name = formData.get("name") as string
        const email = formData.get("email") as string
        const password = formData.get("password") as string
        const orgName = formData.get("organizationName") as string

        console.log(`>>> [createAdmin] Input: email=${email}, orgName=${orgName}`)

        if (!name || !email || !password || !orgName) {
            console.log(">>> [createAdmin] Validation failed: missing fields")
            return { success: false, error: "Missing required fields" }
        }

        console.log(">>> [createAdmin] Checking for existing user...")
        const db = await getDb()
        const existingUser = await db
            .collection<UserDocument>("users")
            .findOne({ email })
        console.log(">>> [createAdmin] Finished checking user. Exists? " + !!existingUser)

        if (existingUser) {
            return { success: false, error: "User with this email already exists" }
        }

        console.log(">>> [createAdmin] Hashing password...")
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        console.log(">>> [createAdmin] Password hashed")

        // Generate unique org code
        console.log(">>> [createAdmin] Generating org code...")
        let code = generateOrgCode()
        let exists = await db
            .collection<OrganizationDocument>("organizations")
            .findOne({ code })

        let attempts = 0
        while (exists && attempts < 5) {
            attempts++
            console.log(`>>> [createAdmin] Org code ${code} exists, retrying (attempt ${attempts})...`)
            code = generateOrgCode()
            exists = await db
                .collection<OrganizationDocument>("organizations")
                .findOne({ code })
        }
        console.log(">>> [createAdmin] Final org code: " + code)

        console.log(`>>> [createAdmin] Creating user and organization...`)

        const now = new Date()
        const organization: OrganizationDocument = {
            uid: randomUUID(),
            name: orgName,
            code,
            createdAt: now,
            updatedAt: now,
        }
        const user: UserDocument = {
            uid: randomUUID(),
            name,
            email,
            password: hashedPassword,
            orgId: organization.uid,
            createdAt: now,
            updatedAt: now,
        }

        await db
            .collection<OrganizationDocument>("organizations")
            .insertOne(organization)
        await db.collection<UserDocument>("users").insertOne(user)

        console.log(`>>> [createAdmin] Successfully created admin ${user.uid}`)

        return {
            success: true,
            user: {
                id: user.uid,
                email: user.email,
                orgName: organization.name,
                orgCode: organization.code,
            },
        }
    } catch (error: any) {
        console.error(">>> [createAdmin] ERROR:", error)
        return { success: false, error: error.message || "An internal error occurred" }
    }
}
