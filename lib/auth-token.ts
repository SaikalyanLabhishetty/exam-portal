import jwt, { type Secret, type SignOptions } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h"

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined")
}

export type AccessTokenPayload = {
    sub: string
    email: string
    role: "admin"
}

const resolvedSecret = JWT_SECRET as Secret
const signOptions: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
}

export function getAccessTokenMaxAgeSeconds() {
    const value = JWT_EXPIRES_IN
    const match = value.match(/^(\d+)([smhd])?$/i)

    if (!match) return 60 * 60

    const amount = Number(match[1])
    const unit = match[2]?.toLowerCase()

    switch (unit) {
        case "d":
            return amount * 24 * 60 * 60
        case "h":
            return amount * 60 * 60
        case "m":
            return amount * 60
        case "s":
        default:
            return amount
    }
}

export function signAccessToken(payload: AccessTokenPayload) {
    return jwt.sign(payload, resolvedSecret, signOptions)
}

export function verifyAccessToken(token: string) {
    return jwt.verify(token, resolvedSecret) as AccessTokenPayload
}