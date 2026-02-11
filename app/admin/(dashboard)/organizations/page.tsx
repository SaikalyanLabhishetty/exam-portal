"use client"

import { useEffect, useState } from "react"

interface Organization {
    id: string
    name: string
    code: string
    createdAt: string
    _count: { exams: number }
}

export default function OrganizationsPage() {
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [newOrgName, setNewOrgName] = useState("")
    const [creating, setCreating] = useState(false)

    const fetchOrganizations = async () => {
        try {
            const res = await fetch("/api/organizations")
            const data = await res.json()
            setOrganizations(data)
        } catch (error) {
            console.error("Error fetching organizations:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrganizations()
    }, [])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        try {
            const res = await fetch("/api/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newOrgName }),
            })
            if (res.ok) {
                setNewOrgName("")
                setShowModal(false)
                fetchOrganizations()
            }
        } catch (error) {
            console.error("Error creating organization:", error)
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this organization?")) return
        try {
            await fetch(`/api/organizations/${id}`, { method: "DELETE" })
            fetchOrganizations()
        } catch (error) {
            console.error("Error deleting organization:", error)
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Organizations</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                >
                    + Create Organization
                </button>
            </div>

            {loading ? (
                <div className="text-zinc-400">Loading...</div>
            ) : organizations.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                    <p className="text-zinc-400">No organizations yet. Create your first one!</p>
                </div>
            ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-zinc-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Name</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Code</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Exams</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Created</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-zinc-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {organizations.map((org) => (
                                <tr key={org.id} className="hover:bg-zinc-800/50">
                                    <td className="px-6 py-4 text-white font-medium">{org.name}</td>
                                    <td className="px-6 py-4">
                                        <code className="bg-zinc-800 px-2 py-1 rounded text-blue-400 text-sm">{org.code}</code>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400">{org._count.exams}</td>
                                    <td className="px-6 py-4 text-zinc-400 text-sm">
                                        {new Date(org.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(org.id)}
                                            className="text-red-400 hover:text-red-300 text-sm"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-4">Create Organization</h2>
                        <form onSubmit={handleCreate}>
                            <input
                                type="text"
                                value={newOrgName}
                                onChange={(e) => setNewOrgName(e.target.value)}
                                placeholder="Organization name"
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                                required
                            />
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:opacity-50"
                                >
                                    {creating ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
