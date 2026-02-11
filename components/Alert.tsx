"use client"

import React from "react"

interface AlertProps {
    alert: {
        message: string
        type: "success" | "error" | "info"
        visible: boolean
    }
    onAlertClose: () => void
    confirm: {
        message: string
        visible: boolean
    }
    onConfirmClose: (result: boolean) => void
}

const Alert: React.FC<AlertProps> = ({ alert, onAlertClose, confirm, onConfirmClose }) => {
    return (
        <>
            {/* Snackbar */}
            <div
                className={`fixed bottom-8 right-8 z-[100] transition-all duration-300 transform ${alert.visible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"
                    }`}
            >
                <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl transition-colors duration-300 ${alert.type === "success" ? "dark:bg-emerald-500/10 bg-emerald-50 dark:border-emerald-500/20 border-emerald-200 text-emerald-600 dark:text-emerald-400" :
                        alert.type === "error" ? "dark:bg-red-500/10 bg-red-50 dark:border-red-500/20 border-red-200 text-red-600 dark:text-red-400" :
                            "dark:bg-blue-500/10 bg-blue-50 dark:border-blue-500/20 border-blue-200 text-blue-600 dark:text-blue-400"
                    }`}>
                    {alert.type === "success" && (
                        <svg className="w-5 h-5 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    {alert.type === "error" && (
                        <svg className="w-5 h-5 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    )}
                    {alert.type === "info" && (
                        <svg className="w-5 h-5 font-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    <span className="font-black text-xs uppercase tracking-widest">{alert.message}</span>
                    <button onClick={onAlertClose} className="ml-2 hover:scale-110 transition-transform">
                        <svg className="w-4 h-4 opacity-50 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirm.visible && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] animate-in fade-in duration-200">
                    <div className="dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-zinc-200 rounded-[32px] p-8 w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 transition-colors duration-300">
                        <div className="w-16 h-16 dark:bg-blue-500/10 bg-blue-50 rounded-full flex items-center justify-center mb-6 mx-auto dark:border-blue-500/20 border-blue-100">
                            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black dark:text-white text-zinc-900 text-center leading-tight tracking-tight mb-2">Confirmation Required</h3>
                        <p className="text-zinc-500 text-center text-sm font-medium leading-relaxed mb-8">{confirm.message}</p>

                        <div className="flex gap-4">
                            <button
                                onClick={() => onConfirmClose(false)}
                                className="flex-1 py-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => onConfirmClose(true)}
                                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 text-xs uppercase tracking-widest"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Alert
