import { Request, Response } from "express"
import {
  ACCESS_COOKIE_NAME,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
} from "../../utils/constants"
import User from "../../models/user.model"

export async function deleteAccount(req: Request, res: Response) {
  try {
    const userId = req.user!.sub

    res.clearCookie(ACCESS_COOKIE_NAME, ACCESS_COOKIE_OPTIONS)
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS)

    await User.findByIdAndDelete(userId)

    res.status(200).json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}
