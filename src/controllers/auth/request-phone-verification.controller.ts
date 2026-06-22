import { Request, Response } from "express"
import User from "../../models/user.model"
import { twilioClient } from "../../server"
import PhoneVerification from "../../models/phone-verification.model"
import { TWILIO_PHONE_NUMBER } from "../../utils/constants"

export async function requestPhoneVerification(req: Request, res: Response) {
  const { callingCode, phoneNumber }: { callingCode: string; phoneNumber: string } = req.body

  const fullNumber = "+" + callingCode.trim() + phoneNumber.trim().toLowerCase()

  try {
    const existingUser = await User.findOne({ phoneNumber: fullNumber }, { _id: 1 })
    if (existingUser) {
      return res.status(400).json({
        error: "Phone number already in use. Please use a different phone number.",
      })
    }

    await PhoneVerification.deleteMany({ phoneNumber: fullNumber })

    const verificationCode = Math.floor(100000 + Math.random() * 900000) // Generate a 6-digit code
    try {
      await PhoneVerification.create({
        phoneNumber: fullNumber,
        code: verificationCode,
      })
    } catch (err) {
      console.error(err)
      throw new Error("Failed to create verification record. Please try again.")
    }

    // Send SMS via AWS SNS
    try {
      const body = `Your verification code is: ${verificationCode}.\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.`

      const message = await twilioClient.messages.create({
        body,
        from: TWILIO_PHONE_NUMBER,
        to: fullNumber,
      })

      if (message.errorCode) {
        console.error("Failed to send SMS:", message.errorMessage)
        throw new Error("Failed to send verification code. Please try again.")
      }
    } catch (err) {
      console.error("Error sending SMS:", err)
      throw new Error("Failed to send verification code. Please try again.")
    }

    return res.status(200).json({
      message: "Verification code sent to phone number.",
    })
  } catch (err: any) {
    return res.status(400).json({
      error: err.message,
    })
  }
}
