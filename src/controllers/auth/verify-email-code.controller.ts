import { Request, Response } from "express"
import User from "../../models/user.model"
import createJWT from "../../utils/create-jwt"
import EmailVerification from "../../models/email-verification.model"

export async function verifyEmailCode(req: Request, res: Response) {
  const { email, code, isSignUp }: { email: string; code: string; isSignUp: boolean } = req.body

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

      const { accessToken, refreshToken } = await createJWT(user._id.toString())

      return res.status(200).json({
        _id: user._id,
        accessToken,
        refreshToken,
      })
    }

    return res.status(200).json({ message: "Email verified successfully." })
  } catch (err: any) {
    return res.status(500).json({
      errors: { general: "Failed to connect. Please try again later." },
    })
  }
}
