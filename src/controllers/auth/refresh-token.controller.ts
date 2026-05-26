import { Request, Response } from "express"
import * as jose from "jose"
import User from "../../models/user.model"
import createJWT from "../../utils/create-jwt"
import {
  COOKIE_MAX_AGE,
  COOKIE_OPTIONS,
  JWT_SECRET,
  REFRESH_COOKIE_OPTIONS,
} from "../../utils/constants"

// Get a new access token using a valid refresh token
export async function refreshTokenPost(req: Request, res: Response) {
  // Accept refresh token from request body (native) or from cookie (web)
  let refreshToken = req.body?.refreshToken as string
  if (!refreshToken && req.cookies) {
    refreshToken = req.cookies[REFRESH_COOKIE_OPTIONS.name]
  }

  if (!refreshToken) {
    return res.status(401).json({ error: "Missing refresh token" })
  }

  try {
    let payload: jose.JWTVerifyResult
    try {
      payload = await jose.jwtVerify(refreshToken, new TextEncoder().encode(JWT_SECRET))
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired refresh token" })
    }

    if (payload.payload.type !== "refresh") {
      return res.status(401).json({ error: "Invalid token type" })
    }

    const user = await User.findById(payload.payload.sub)
    if (!user) {
      return res.status(401).json({ error: "User not found" })
    }

    const { accessToken } = await createJWT(user._id.toString())
    const issuedAt = Math.floor(Date.now() / 1000)

    if (req.cookies && Object.keys(req.cookies).length > 0) {
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

    return res.json({
      _id: user._id,
      accessToken,
      issuedAt: issuedAt,
      expiresAt: issuedAt + COOKIE_MAX_AGE,
    })
  } catch (err) {
    console.error("Error refreshing token:", err)
    return res.status(500).json({ error: "Internal server error" })
  }
}
