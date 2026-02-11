import { auth } from "@/auth"
import { getDb, OrganizationDocument, UserDocument } from "@/lib/mongodb"

export default async function AdminDashboard() {
    const session = await auth()
    const db = await getDb()

    const user = session?.user?.email
        ? await db
            .collection<UserDocument>("users")
            .findOne({ email: session.user.email })
        : null

    const organization = user?.orgId
        ? await db
            .collection<OrganizationDocument>("organizations")
            .findOne({ uid: user.orgId })
        : null

    const examDocs = user?.orgId
        ? await db
            .collection<{ uid: string }>("exams")
            .find({ orgId: user.orgId })
            .project({ uid: 1 })
            .toArray()
        : []

    const examCount = examDocs.length
    const studentCount = user?.orgId
        ? await db.collection("students").countDocuments({ orgId: user.orgId })
        : 0

    const stats = [
        {
            label: "Exams",
            value: examCount,
            color: "bg-green-500",
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            label: "Students",
            value: studentCount,
            color: "bg-purple-500",
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )
        },
    ]

    return (
        <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Dashboard</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 lg:col-span-1 transition-colors duration-300">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Organization Info</h2>
                    <div className="space-y-4 text-sm font-medium">
                        <div>
                            <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest">Organization</p>
                            <p className="text-zinc-900 dark:text-white font-black tracking-tight mt-1">
                                {organization?.name ?? "Not assigned"}
                            </p>
                        </div>
                        <div>
                            <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest">Admin Name</p>
                            <p className="text-zinc-900 dark:text-white font-black tracking-tight mt-1">
                                {user?.name || session?.user?.name || "Admin"}
                            </p>
                        </div>
                        <div>
                            <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest">Organization Code</p>
                            <p className="text-zinc-900 dark:text-white font-black tracking-tight mt-1">
                                <code className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-lg border border-blue-500/20">{organization?.code ?? "-"}</code>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:col-span-2">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 transition-all duration-300 shadow-xl shadow-black/5 dark:shadow-none"
                        >
                            <div className="flex items-center gap-6">
                                <div
                                    className={`w-16 h-16 ${stat.color} rounded-[24px] flex items-center justify-center shadow-lg shadow-${stat.color.split('-')[1]}-500/20`}
                                >
                                    {stat.icon}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
                                    <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}
