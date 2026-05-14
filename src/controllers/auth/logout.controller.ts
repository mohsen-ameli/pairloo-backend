import { Request, Response } from "express"
import {
  ACCESS_COOKIE_NAME,
  ACCESS_COOKIE_OPTIONS,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
} from "../../utils/constants"

export async function logoutPost(req: Request, res: Response) {
  try {
    // Clear cookies
    res.clearCookie(ACCESS_COOKIE_NAME, ACCESS_COOKIE_OPTIONS)
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS)

    res.status(200).json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}
