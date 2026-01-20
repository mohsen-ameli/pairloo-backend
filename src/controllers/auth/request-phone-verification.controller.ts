import { Request, Response } from "express"
import User from "../../models/user.model"
import Verification from "../../models/verification.model"
import { snsClient } from "../../server"
import { PublishCommand } from "@aws-sdk/client-sns"

export async function requestPhoneVerification(req: Request, res: Response) {
  const { callingCode, phoneNumber }: { callingCode: string; phoneNumber: string } = req.body

  const fullNumber = "+" + callingCode.trim() + phoneNumber.trim().toLowerCase()

  try {
    const user = await User.findOne({ phoneNumber: fullNumber })
    if (user) {
      return res.status(400).json({
        error: "Phone number already in use. Please use a different phone number.",
      })
    }

    const existingVerification = await Verification.findOne({
      phoneNumber: fullNumber,
    })
    let verificationCode: number

    if (existingVerification) {
      verificationCode = existingVerification.code
    } else {
      verificationCode = Math.floor(100000 + Math.random() * 900000) // Generate a 6-digit code
      try {
        await Verification.create({
          phoneNumber: fullNumber,
          code: verificationCode,
        })
      } catch (err) {
        console.log(err)
        throw new Error("Failed to create verification record. Please try again.")
      }
    }

    // Send SMS via AWS SNS
    try {
      const message = `Your verification code is: ${verificationCode}.\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.`
      const response = await snsClient.send(
        new PublishCommand({
          Message: message,
          PhoneNumber: fullNumber,
        })
      )
      if (!response.MessageId) {
        throw new Error("Failed to send verification code. Please try again.")
      }
    } catch (err) {
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
