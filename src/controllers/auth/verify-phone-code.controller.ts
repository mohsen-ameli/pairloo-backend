import { Request, Response } from "express"
import PhoneVerification from "../../models/phone-verification.model"

export async function verifyPhoneCode(req: Request, res: Response) {
  const {
    callingCode,
    phoneNumber,
    code,
  }: { callingCode: string; phoneNumber: string; code: string } = req.body

  const fullNumber = "+" + callingCode.trim() + phoneNumber.trim().toLowerCase()

  try {
    const userVerify = await PhoneVerification.findOne({
      phoneNumber: fullNumber,
      code: Number(code),
    })
    if (!userVerify) {
      return res.status(400).json({
        error: "Invalid verification code. Please check the code again and try again.",
      })
    }

    return res.status(200).json({ message: "Phone Number verified successfully." })
  } catch (err) {
    console.error("Error in verifyPhoneCode:", err)
    return res.status(500).json({
      error: "Failed to connect. Please try again later.",
    })
  }
}
