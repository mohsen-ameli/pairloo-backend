/**
 * Application Constants
 *
 * This file centralizes all constants used across the application.
 * Import from this file instead of defining constants in individual files.
 */
import dotenv from "dotenv"
dotenv.config()

export const IS_PRODUCTION = process.env.NODE_ENV === "production"

export const MAX_POST_QUESTIONS = IS_PRODUCTION ? 11 : 3
export const AI_ON = IS_PRODUCTION ? true : process.env.AI_ON === "1"

// Authentication Constants
export const COOKIE_NAME = "auth_token"
export const REFRESH_COOKIE_NAME = "refresh_token"
export const COOKIE_MAX_AGE = 5000 // seconds
export const ACCESS_TOKEN_EXPIRY = "5000s" // seconds
export const REFRESH_TOKEN_EXPIRY = "30d" // days
export const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

// Refresh Token Constants
export const REFRESH_BEFORE_EXPIRY_SEC = 60 // Refresh token 1 minute before expiry

export const DB_URI = process.env.DB_URI!
export const CDN_BASE_URL = process.env.CDN_BASE_URL
export const S3_EXPIRES_IN_SECONDS = 2 * 60 * 60 // 2 hours

// Google OAuth Constants
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
export const GOOGLE_REDIRECT_URI = `${process.env.PUBLIC_BASE_URL}/api/auth/callback`
export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"

// AWS
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!

// Environment Constants
export const BASE_URL = process.env.PUBLIC_BASE_URL
export const FRONTEND_URL = process.env.PUBLIC_FRONTEND_URL
export const APP_SCHEME = process.env.PUBLIC_SCHEME
export const JWT_SECRET = process.env.JWT_SECRET!
export const EMAIL_HOST = process.env.EMAIL_HOST!
export const EMAIL_USER = process.env.EMAIL_USER!
export const EMAIL_PASS = process.env.EMAIL_PASS!

// Cookie Settings
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "Lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE,
}

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "Lax" as const,
  path: "/api/auth/refresh", // Restrict to refresh endpoint only
  maxAge: REFRESH_TOKEN_MAX_AGE,
}
