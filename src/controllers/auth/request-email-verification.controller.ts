import { Request, Response } from "express"
import User from "../../models/user.model"
import { EMAIL_USER } from "../../utils/constants"
import { transporter } from "../../server"
import EmailVerification from "../../models/email-verification.model"

export async function requestEmailVerification(req: Request, res: Response) {
  let { email, isSignUp }: { email: string; isSignUp: boolean } = req.body
  email = email.trim().toLowerCase()

  try {
    const user = await User.findOne({ email }, { _id: 1 })
    if (isSignUp && user) {
      return res.status(400).json({
        error: "Email already in use. Please use a different email.",
      })
    } else if (!user && !isSignUp) {
      return res.status(400).json({
        error: "Email not found. Please check your email address and try again.",
      })
    }

    const existingVerification = await EmailVerification.findOne({ email })
    let verificationCode: number

    if (existingVerification) {
      verificationCode = existingVerification.code
    } else {
      verificationCode = Math.floor(100000 + Math.random() * 900000) // 6-digit code
      try {
        await EmailVerification.create({
          email,
          code: verificationCode,
        })
      } catch (err) {
        throw new Error("Failed to create verification record. Please try again.")
      }
    }

    const mailOptions = {
      from: EMAIL_USER,
      to: email,
      subject: "Verification Code",
      text: `Your verification code is: ${verificationCode}.\nPlease use this code within 5 minutes or it will expire and you will need to retrieve a new code.\n\nDo not share this code with anyone.`,
    }

    await transporter.sendMail(mailOptions)

    return res.status(200).json({
      message: "Verification code sent to email.",
    })
  } catch (err: any) {
    return res.status(400).json({
      error: "Failed to connect. Please try again later.",
    })
  }
}
