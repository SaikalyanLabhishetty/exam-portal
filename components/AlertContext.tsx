"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from "react"
import Alert from "./Alert"

type AlertType = "success" | "error" | "info"

interface AlertState {
    message: string
    type: AlertType
    visible: boolean
}

interface ConfirmState {
    message: string
    visible: boolean
    resolve: ((value: boolean) => void) | null
}

interface AlertContextType {
    showAlert: (message: string, type?: AlertType) => void
    confirm: (message: string) => Promise<boolean>
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [alert, setAlert] = useState<AlertState>({ message: "", type: "info", visible: false })
    const [confirmState, setConfirmState] = useState<ConfirmState>({ message: "", visible: false, resolve: null })
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

    const showAlert = useCallback((message: string, type: AlertType = "info") => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        setAlert({ message, type, visible: true })

        timeoutRef.current = setTimeout(() => {
            setAlert(prev => ({ ...prev, visible: false }))
        }, 3000)
    }, [])

    const confirm = useCallback((message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({ message, visible: true, resolve })
        })
    }, [])

    const handleConfirmClose = (result: boolean) => {
        if (confirmState.resolve) {
            confirmState.resolve(result)
        }
        setConfirmState(prev => ({ ...prev, visible: false, resolve: null }))
    }

    return (
        <AlertContext.Provider value={{ showAlert, confirm }}>
            {children}
            <Alert
                alert={alert}
                onAlertClose={() => setAlert(prev => ({ ...prev, visible: false }))}
                confirm={confirmState}
                onConfirmClose={handleConfirmClose}
            />
        </AlertContext.Provider>
    )
}

export const useAlert = () => {
    const context = useContext(AlertContext)
    if (!context) {
        throw new Error("useAlert must be used within an AlertProvider")
    }
    return context
}
