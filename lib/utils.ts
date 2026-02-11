import { randomInt } from "crypto"

// Alphanumeric codes (no confusing chars like 0/O, 1/l)
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

function generateCode(length: number): string {
    let result = ""
    for (let i = 0; i < length; i += 1) {
        result += alphabet[randomInt(0, alphabet.length)]
    }
    return result
}

export function generateOrgCode(): string {
    return generateCode(6) // e.g., "ABC123"
}

export function generateExamCode(): string {
    return generateCode(8) // e.g., "EXAM1234"
}
