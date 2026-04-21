import { Request, Response } from "express"
import User from "../../models/user.model"
import Expo from "expo-server-sdk"

export async function updateExpoPushToken(req: Request, res: Response) {
  const userId = req.user!.sub
  const { expoPushToken } = req.body

  if (!expoPushToken) {
    return res.status(400).json({ error: "Expo push token is required" })
  } else if (!Expo.isExpoPushToken(expoPushToken)) {
    return res.status(400).json({ error: "Push token is not valid!" })
  }

  try {
    await User.findByIdAndUpdate(userId, { expoPushToken })
    return res.json({ message: "Expo push token updated successfully" })
  } catch (error) {
    console.error("Error updating expo push token:", error)
    return res.status(500).json({ error: "Failed to update expo push token" })
  }
}
