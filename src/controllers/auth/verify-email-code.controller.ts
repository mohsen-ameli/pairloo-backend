import { Request, Response } from "express"
import User from "../../models/user.model"
import createJWT from "../../utils/create-jwt"
import EmailVerification from "../../models/email-verification.model"
import { COOKIE_MAX_AGE, COOKIE_OPTIONS, REFRESH_COOKIE_OPTIONS } from "../../utils/constants"

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
