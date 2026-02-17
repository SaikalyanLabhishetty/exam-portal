import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || "exam_portal"

if (!uri) {
    console.error(">>> [mongodb] ERROR: MONGODB_URI is not defined!")
    throw new Error("MONGODB_URI environment variable is not set")
}

export type UserDocument = {
    _id?: string
    uid: string
    email: string
    password: string
    name?: string | null
    orgId?: string | null
    createdAt: Date
    updatedAt: Date
}

export type OrganizationDocument = {
    _id?: string
    uid: string
    name: string
    code: string
    createdAt: Date
    updatedAt: Date
}

export type ExamDocument = {
    _id?: string
    uid: string
    orgId: string
    name: string
    examCode: string
    duration: number
    examDate?: string | null
    startTime?: string | null
    endTime?: string | null
    totalMarks: number
    snapshotInterval: number
    proctoringEnabled: boolean
    questions?: {
        question: string
        questionType: "text" | "option" | "multi_select" | "formula"
        answer: string
        options?: string[]
        imageSrc?: string
    }[]
    createdAt: Date
    updatedAt: Date
}

export type StudentDocument = {
    _id?: string
    uid: string
    orgId: string
    examId?: string // Keeping for compatibility
    name: string
    rollNo: string
    emailId: string
    phoneNumber: string
    section: string
    year: string
    createdAt: Date
    updatedAt: Date
}

const globalForMongo = globalThis as unknown as {
    mongoClientPromise?: Promise<MongoClient>
}

const client = new MongoClient(uri, {
    retryWrites: true,
    serverSelectionTimeoutMS: 5000,
})

export async function getMongoClient() {
    if (!globalForMongo.mongoClientPromise) {
        globalForMongo.mongoClientPromise = client.connect()
    }

    return globalForMongo.mongoClientPromise
}

export async function getDb() {
    const mongoClient = await getMongoClient()
    return mongoClient.db(dbName)
}

export function toPublicId<T extends { uid: string; _id?: string }>(doc: T) {
    const { uid, _id, ...rest } = doc
    return { id: uid, ...rest }
}

export function toPublicIds<T extends { uid: string; _id?: string }>(docs: T[]) {
    return docs.map((doc) => {
        const { uid, _id, ...rest } = doc
        return { id: uid, ...rest }
    })
}
