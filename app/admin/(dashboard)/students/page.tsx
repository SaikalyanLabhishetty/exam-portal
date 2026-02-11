"use client"

import { useEffect, useState, useRef } from "react"
import { useAlert } from "@/components/AlertContext"

interface Student {
    id: string
    name: string
    rollNo: string
    emailId: string
    phoneNumber: string
    section: string
    year: string
    createdAt: string
}

interface UploadError {
    row: any
    error: string
}

export default function StudentsPage() {
    const { showAlert, confirm } = useAlert()
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showHelpModal, setShowHelpModal] = useState(false)
    const [creating, setCreating] = useState(false)
    const [editingStudent, setEditingStudent] = useState<Student | null>(null)
    const [form, setForm] = useState({
        name: "",
        rollNo: "",
        emailId: "",
        phoneNumber: "",
        section: "",
        year: "",
    })

    // CSV Upload state
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
    const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchStudents = async () => {
        try {
            const res = await fetch("/api/students")
            const data = await res.json()
            setStudents(data)
        } catch (error) {
            console.error("Error fetching students:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStudents()
    }, [])

    const handleOpenAddModal = () => {
        setEditingStudent(null)
        setForm({
            name: "",
            rollNo: "",
            emailId: "",
            phoneNumber: "",
            section: "",
            year: "",
        })
        setShowModal(true)
    }

    const handleOpenEditModal = (student: Student) => {
        setEditingStudent(student)
        setForm({
            name: student.name,
            rollNo: student.rollNo,
            emailId: student.emailId,
            phoneNumber: student.phoneNumber || "",
            section: student.section || "",
            year: student.year || "",
        })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        try {
            const url = editingStudent
                ? `/api/students/${editingStudent.id}`
                : "/api/students"
            const method = editingStudent ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })
            if (res.ok) {
                setForm({
                    name: "",
                    rollNo: "",
                    emailId: "",
                    phoneNumber: "",
                    section: "",
                    year: "",
                })
                setShowModal(false)
                setEditingStudent(null)
                showAlert(editingStudent ? "Student updated successfully" : "Student added successfully", "success")
                fetchStudents()
            } else {
                const data = await res.json()
                showAlert(data.error || "Failed to save student", "error")
            }
        } catch (error) {
            console.error("Error saving student:", error)
            showAlert("Connection error", "error")
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        const confirmed = await confirm("Are you sure you want to delete this student record? This action cannot be undone.")
        if (!confirmed) return

        try {
            const res = await fetch(`/api/students/${id}`, { method: "DELETE" })
            if (res.ok) {
                showAlert("Student deleted successfully", "success")
                fetchStudents()
            } else {
                showAlert("Failed to delete student", "error")
            }
        } catch (error) {
            console.error("Error deleting student:", error)
            showAlert("Connection error", "error")
        }
    }

    const parseCSV = (text: string) => {
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "")
        if (lines.length < 2) return []

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase())
        return lines.slice(1).map(line => {
            const values = line.split(",").map(v => v.trim())
            const obj: any = {}
            headers.forEach((header, i) => {
                obj[header] = values[i]
            })
            return obj
        })
    }

    const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            const text = event.target?.result as string
            const rows = parseCSV(text)
            if (rows.length === 0) {
                showAlert("Invalid CSV or empty file", "error")
                return
            }

            setUploading(true)
            setUploadErrors([])
            setUploadProgress({ current: 0, total: rows.length })

            const errors: UploadError[] = []
            let successCount = 0

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]

                // Map column names flexibly
                const studentData = {
                    name: row.name || row.full_name || row["full name"],
                    rollNo: row.rollno || row.roll_no || row["roll no"] || row.roll_number,
                    emailId: row.emailid || row.email_id || row["email id"] || row.email,
                    year: row.year,
                    phoneNumber: row.phonenumber || row.phone_number || row["phone number"] || row.phone,
                    section: row.section,
                }

                // Validation
                const missing = []
                if (!studentData.name) missing.push("name")
                if (!studentData.rollNo) missing.push("roll_no")
                if (!studentData.emailId) missing.push("email_id")
                if (!studentData.year) missing.push("year")

                if (missing.length > 0) {
                    errors.push({ row, error: `Missing: ${missing.join(", ")}` })
                    setUploadProgress(prev => ({ ...prev, current: i + 1 }))
                    continue
                }

                try {
                    const res = await fetch("/api/students", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(studentData),
                    })

                    if (res.ok) {
                        successCount++
                    } else {
                        const data = await res.json()
                        errors.push({ row, error: data.error || "API Error" })
                    }
                } catch (err) {
                    errors.push({ row, error: "Network Error" })
                }

                setUploadProgress(prev => ({ ...prev, current: i + 1 }))
            }

            setUploadErrors(errors)
            setUploading(false)
            fetchStudents()

            if (errors.length > 0) {
                showAlert(`Upload complete. ${successCount} added, ${errors.length} failed.`, "info")
            } else {
                showAlert(`Successfully uploaded ${successCount} students.`, "success")
            }
        }
        reader.readAsText(file)

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const downloadErrorCSV = () => {
        if (uploadErrors.length === 0) return

        const headers = Object.keys(uploadErrors[0].row).join(",") + ",error"
        const rows = uploadErrors.map(err => {
            const values = Object.values(err.row).join(",")
            return `${values},${err.error}`
        })
        const csvContent = [headers, ...rows].join("\n")
        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "error.csv"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    const downloadSampleCSV = () => {
        const headers = "name,roll_no,email_id,year,phone_number,section"
        const sampleRow = "John Doe,ROLL/24/001,john.doe@example.com,2024,+919876543210,A"
        const csvContent = `${headers}\n${sampleRow}`
        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "sample_students.csv"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold dark:text-white text-zinc-900">Students</h1>
                <div className="flex gap-3">
                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleCSVUpload}
                    />
                    <button
                        onClick={() => setShowHelpModal(true)}
                        className="p-3 dark:bg-zinc-800 bg-zinc-100 dark:text-zinc-400 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-colors dark:border-zinc-700 border-zinc-200 border"
                        title="CSV Upload Help"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="px-6 py-3 dark:bg-zinc-800 bg-zinc-100 dark:text-white text-zinc-700 font-medium rounded-xl transition-colors flex items-center gap-2 dark:border-zinc-700 border-zinc-200 border font-black text-xs uppercase tracking-widest"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload CSV
                    </button>
                    <button
                        onClick={handleOpenAddModal}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 text-xs uppercase tracking-widest"
                    >
                        + Add Student
                    </button>
                </div>
            </div>

            {uploading && (
                <div className="mb-8 p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-blue-400 font-semibold tracking-wide text-xs uppercase tracking-widest font-black">Uploading Students...</span>
                        <span className="text-blue-400 font-bold">{uploadProgress.current} / {uploadProgress.total}</span>
                    </div>
                    <div className="w-full dark:bg-zinc-800 bg-zinc-200 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-blue-500 h-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {!uploading && uploadErrors.length > 0 && (
                <div className="mb-8 p-6 bg-red-600/10 border border-red-500/20 rounded-2xl flex justify-between items-center">
                    <div>
                        <p className="text-red-400 font-black text-sm uppercase tracking-tight">{uploadErrors.length} rows failed to upload.</p>
                        <p className="text-zinc-500 text-xs font-medium">Please check the mandatory fields and try again.</p>
                    </div>
                    <button
                        onClick={downloadErrorCSV}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors"
                    >
                        Download error.csv
                    </button>
                </div>
            )}

            {loading ? (
                <div className="text-zinc-400 font-medium animate-pulse">Loading students...</div>
            ) : students.length === 0 ? (
                <div className="dark:bg-zinc-900 bg-zinc-100 border dark:border-zinc-800 border-zinc-200 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 dark:bg-zinc-800 bg-zinc-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <p className="text-zinc-400 font-medium">No students yet. Add manually or upload a CSV!</p>
                </div>
            ) : (
                <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-zinc-200 rounded-2xl overflow-hidden shadow-xl transition-all duration-300">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="dark:bg-zinc-800/50 bg-zinc-50 transition-colors">
                                <th className="px-6 py-5 text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em] border-b dark:border-zinc-800 border-zinc-200">Name</th>
                                <th className="px-6 py-5 text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em] border-b dark:border-zinc-800 border-zinc-200">Roll No</th>
                                <th className="px-6 py-5 text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em] border-b dark:border-zinc-800 border-zinc-200">Email</th>
                                <th className="px-6 py-5 text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em] border-b dark:border-zinc-800 border-zinc-200">Phone</th>
                                <th className="px-6 py-5 text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em] border-b dark:border-zinc-800 border-zinc-200">Sec / Year</th>
                                <th className="px-6 py-5 text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em] border-b dark:border-zinc-800 border-zinc-200 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-zinc-800 divide-zinc-200">
                            {students.map((student) => (
                                <tr key={student.id} className="group dark:hover:bg-zinc-800/30 hover:bg-zinc-50 transition-all">
                                    <td className="px-6 py-4">
                                        <p className="dark:text-white text-zinc-900 font-bold tracking-tight">{student.name}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <code className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg text-xs font-black border border-blue-500/20">{student.rollNo}</code>
                                    </td>
                                    <td className="px-6 py-4 dark:text-zinc-400 text-zinc-600 text-sm font-medium">{student.emailId}</td>
                                    <td className="px-6 py-4 dark:text-zinc-400 text-zinc-600 text-sm font-medium">{student.phoneNumber || "—"}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="dark:text-zinc-500 text-zinc-400 text-[10px] font-black uppercase">{student.section || "NA"}</span>
                                            <span className="h-1 w-1 rounded-full dark:bg-zinc-700 bg-zinc-300" />
                                            <span className="dark:text-white text-zinc-900 text-xs font-bold">{student.year}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenEditModal(student)}
                                                className="p-2 dark:text-zinc-500 text-zinc-400 hover:dark:text-white hover:text-zinc-900 dark:hover:bg-zinc-800 hover:bg-zinc-200 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(student.id)}
                                                className="p-2 dark:text-zinc-500 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2.25 2.25 0 0115.89 21H8.11a2.25 2.25 0 01-2.243-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Help Modal */}
            {showHelpModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]">
                    <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-zinc-200 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-black dark:text-white text-zinc-900 tracking-tight">CSV Structure Guide</h2>
                                <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mt-1">Bulk Import Utility</p>
                            </div>
                            <button onClick={() => setShowHelpModal(false)} className="text-zinc-500 hover:dark:text-white hover:text-zinc-900 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">Mandatory Columns</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { key: "name", desc: "Full name of student" },
                                        { key: "roll_no", desc: "Unique roll number" },
                                        { key: "email_id", desc: "Official email address" },
                                        { key: "year", desc: "Academic year (e.g. 2024)" }
                                    ].map(field => (
                                        <div key={field.key} className="p-3 dark:bg-zinc-950 bg-zinc-50 border dark:border-zinc-800 border-zinc-200 rounded-xl">
                                            <code className="dark:text-white text-zinc-900 text-[10px] font-black">{field.key}</code>
                                            <p className="text-zinc-500 text-[10px] mt-1 font-medium italic">{field.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Optional Columns</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { key: "phone_number", desc: "Contact number" },
                                        { key: "section", desc: "Class section (A, B, C...)" }
                                    ].map(field => (
                                        <div key={field.key} className="p-3 dark:bg-zinc-950 bg-zinc-50 border dark:border-zinc-800 border-zinc-200 rounded-xl">
                                            <code className="text-zinc-400 text-[10px] font-black">{field.key}</code>
                                            <p className="text-zinc-600 text-[10px] mt-1 font-medium italic">{field.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t dark:border-zinc-800 border-zinc-200 flex items-center justify-between">
                                <p className="text-zinc-500 text-[10px] font-bold max-w-[200px]">
                                    Columns can use underscores or spaces. E.g., <code className="dark:text-zinc-400 text-zinc-600 hover:text-white">roll_no</code>.
                                </p>
                                <button
                                    onClick={downloadSampleCSV}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Sample CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-zinc-200 rounded-[2.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-300 overflow-hidden">
                        <div className="relative p-8 pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-black dark:text-white text-zinc-900 tracking-tight mb-1">
                                        {editingStudent ? "Edit Records" : "New Registration"}
                                    </h2>
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">Student Enrollment System</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowModal(false)
                                        setEditingStudent(null)
                                    }}
                                    className="p-2 dark:text-zinc-500 text-zinc-400 hover:dark:text-white hover:text-zinc-900 dark:hover:bg-zinc-800 hover:bg-zinc-100 rounded-full transition-all"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            placeholder="Enter student's full name"
                                            className="w-full px-5 py-4 dark:bg-zinc-950 bg-zinc-50 border-2 dark:border-zinc-800 border-zinc-100 rounded-2xl dark:text-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            value={form.emailId}
                                            onChange={(e) => setForm({ ...form, emailId: e.target.value })}
                                            placeholder="email@example.com"
                                            className="w-full px-5 py-4 dark:bg-zinc-950 bg-zinc-50 border-2 dark:border-zinc-800 border-zinc-100 rounded-2xl dark:text-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            Phone Number
                                        </label>
                                        <input
                                            type="text"
                                            value={form.phoneNumber}
                                            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                                            placeholder="+91 XXXXX XXXXX"
                                            className="w-full px-5 py-4 dark:bg-zinc-950 bg-zinc-50 border-2 dark:border-zinc-800 border-zinc-100 rounded-2xl dark:text-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                        />
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 7h.01M7 11h.01M7 15h.01M11 7h.01M11 11h.01M11 15h.01M15 7h.01M15 11h.01M15 15h.01M19 7h.01M19 11h.01M19 15h.01M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                                            </svg>
                                            Roll Number *
                                        </label>
                                        <input
                                            type="text"
                                            value={form.rollNo}
                                            onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                                            placeholder="ROLL/24/001"
                                            className="w-full px-5 py-4 dark:bg-zinc-950 bg-zinc-50 border-2 dark:border-zinc-800 border-zinc-100 rounded-2xl dark:text-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Year *
                                            </label>
                                            <input
                                                type="text"
                                                value={form.year}
                                                onChange={(e) => setForm({ ...form, year: e.target.value })}
                                                placeholder="2024"
                                                className="w-full px-5 py-4 dark:bg-zinc-950 bg-zinc-50 border-2 dark:border-zinc-800 border-zinc-100 rounded-2xl dark:text-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                                </svg>
                                                Section
                                            </label>
                                            <input
                                                type="text"
                                                value={form.section}
                                                onChange={(e) => setForm({ ...form, section: e.target.value })}
                                                placeholder="A/B/C"
                                                className="w-full px-5 py-4 dark:bg-zinc-950 bg-zinc-50 border-2 dark:border-zinc-800 border-zinc-100 rounded-2xl dark:text-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 justify-end pt-8 border-t dark:border-zinc-800 border-zinc-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false)
                                        setEditingStudent(null)
                                    }}
                                    className="px-8 py-4 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl disabled:opacity-50 text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/40 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {creating ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing
                                        </>
                                    ) : (
                                        editingStudent ? "Update Account" : "Create Account"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
