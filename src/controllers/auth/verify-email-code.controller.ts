import { Request, Response } from "express"
import User from "../../models/user.model"
import createJWT from "../../utils/create-jwt"
import EmailVerification from "../../models/email-verification.model"
import {
  ACCESS_COOKIE_NAME,
  COOKIE_MAX_AGE,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
} from "../../utils/constants"

export async function verifyEmailCode(req: Request, res: Response) {
  const {
    email,
    code,
    isSignUp,
    platform,
  }: { email: string; code: string; isSignUp: boolean; platform: string } = req.body

  try {
    const userVerify = await EmailVerification.findOne({
      email: email.toLowerCase(),
      code: Number(code),
    })
    if (!userVerify) {
      return res.status(400).json({
        errors: { general: "Invalid verification code. Please check the code and try again." },
      })
    }

    if (!isSignUp) {
      const user = await User.findOne({ email: email.toLowerCase() }, { _id: 1 }).lean()

      if (!user) {
        return res.status(400).json({
          errors: { general: "Invalid email. Please check your email address and try again." },
        })
      }

      await EmailVerification.deleteMany({ email: email.toLowerCase() })

      // Create JWT tokens
      const { accessToken, refreshToken } = await createJWT(user._id.toString())
      const issuedAt = Math.floor(Date.now() / 1000)

      // Handle web platform with cookies
      if (platform === "web") {
        // Set the access token in an HTTP-only cookie
        res.cookie(ACCESS_COOKIE_NAME, accessToken, ACCESS_COOKIE_OPTIONS)

        // Set the refresh token in a separate HTTP-only cookie
        res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS)

        // Send a response with success and token metadata
        return res.status(200).json({
          _id: user._id,
          issuedAt: issuedAt,
          expiresAt: issuedAt + COOKIE_MAX_AGE,
        })
      }

      return res.status(200).json({
        _id: user._id,
        accessToken,
        refreshToken,
        issuedAt: issuedAt,
        expiresAt: issuedAt + COOKIE_MAX_AGE,
      })
    }

    return res.status(200).json({ message: "Email verified successfully." })
  } catch (err) {
    console.error("Error in verifyEmailCode:", err)
    return res.status(500).json({
      errors: { general: "Failed to connect. Please try again later." },
    })
  }
}
