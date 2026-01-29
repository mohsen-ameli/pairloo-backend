import { Request, Response } from "express"
import User from "../../models/user.model"
import Verification from "../../models/verification.model"
import createJWT from "../../utils/create-jwt"

export async function verifyEmailCode(req: Request, res: Response) {
  const { email, code, isSignUp }: { email: string; code: string; isSignUp: boolean } = req.body

  try {
    const userVerify = await Verification.findOne({
      email: email.toLowerCase(),
      code: Number(code),
    })
    if (!userVerify) {
      return res.status(400).json({
        errors: { general: "Invalid verification code. Please check the code and try again." },
      })
    }

    if (!isSignUp) {
      const user = await User.findOne(
        { email: email.toLowerCase() },
        {
          _id: 1,
          username: 1,
          firstName: 1,
          lastName: 1,
          picture: 1,
          phoneNumber: 1,
          country: 1,
          city: 1,
          state: 1,
          latitude: 1,
          longitude: 1,
          timezone: 1,
          locationId: 1,
          email: 1,
          createdAt: 1,
          updatedAt: 1,
        }
      ).lean()

      if (!user) {
        return res.status(400).json({
          errors: { general: "Invalid email. Please check your email address and try again." },
        })
      }

      await User.updateUserPicture(user)

      await Verification.deleteMany({ email: email.toLowerCase() })

      const { accessToken, refreshToken } = await createJWT(user._id.toString())

      return res.status(200).json({
        ...user,
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
