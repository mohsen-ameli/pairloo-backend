import * as jose from "jose"
import {
  COOKIE_MAX_AGE,
  COOKIE_OPTIONS,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  REFRESH_COOKIE_OPTIONS,
} from "../../utils/constants"
import { Request, Response } from "express"
import User from "../../models/user.model"
import createJWT from "../../utils/create-jwt"

// Exchanges authorization code for JWT tokens and user info
export async function tokenPost(req: Request, res: Response) {
  const code = req.body.code as string
  const platform = (req.body.platform as string) || "native" // Default to native if not specified

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" })
  }

  try {
    // Exchange authorization code for tokens
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
        code: code,
      }),
    })
    const data = await response.json()

    if (!data.id_token) {
      return res.status(400).json({ error: "Missing required parameters" })
    }
    if (data.error) {
      return res.status(400).json({
        error: data.error,
        error_description: data.error_description,
        message:
          "OAuth validation error - please ensure the app complies with Google's OAuth 2.0 policy",
      })
    }

    // userInfo from Google
    const userInfo = jose.decodeJwt(data.id_token) as any

    // Find user in DB
    const user = await User.findOne({ email: userInfo.email }, { _id: 1, picture: 1 })

    if (!user) {
      return res.status(409).json({
        email: userInfo.email,
        firstName: userInfo.given_name,
        lastName: userInfo.family_name,
        picture: userInfo.picture,
        emailVerified: userInfo.email_verified,
      })
    }

    // Update user picture if not set
    if (!user.picture) {
      user.set("picture", userInfo.picture)
      await user.save()
    }

    // Create JWT tokens
    const { accessToken, refreshToken } = await createJWT(user._id.toString())
    const issuedAt = Math.floor(Date.now() / 1000)

    // Handle web platform with cookies
    if (platform === "web") {
      // Set the access token in an HTTP-only cookie
      res.cookie(COOKIE_OPTIONS.name, accessToken, {
        maxAge: COOKIE_OPTIONS.maxAge,
        httpOnly: COOKIE_OPTIONS.httpOnly,
        secure: COOKIE_OPTIONS.secure,
        sameSite: "lax",
        path: COOKIE_OPTIONS.path,
      })

      // Set the refresh token in a separate HTTP-only cookie
      res.cookie(REFRESH_COOKIE_OPTIONS.name, refreshToken, {
        maxAge: REFRESH_COOKIE_OPTIONS.maxAge,
        httpOnly: REFRESH_COOKIE_OPTIONS.httpOnly,
        secure: REFRESH_COOKIE_OPTIONS.secure,
        sameSite: "lax",
        path: REFRESH_COOKIE_OPTIONS.path,
      })

      // Send a response with success and token metadata
      return res.json({
        _id: user._id,
        issuedAt: issuedAt,
        expiresAt: issuedAt + COOKIE_MAX_AGE,
      })
    }

    // For native platforms, return both tokens in the response body
    return res.json({
      _id: user._id,
      accessToken,
      refreshToken,
      issuedAt: issuedAt,
      expiresAt: issuedAt + COOKIE_MAX_AGE,
    })
  } catch (err) {
    console.error("Error exchanging code for tokens:", err)
    return res.status(500).json({ error: "Internal server error" })
  }
}
