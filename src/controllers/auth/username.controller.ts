import { Request, Response } from "express"
import User from "../../models/user.model"

export async function usernameAvailableGet(req: Request, res: Response) {
  if (!req.query.username) {
    return res.status(400).json({ errors: { username: "Username query parameter is required." } })
  }

  const username = req.query.username.toString().trim().toLowerCase()
  try {
    const user = await User.findOne({ username }, { _id: 1 })
    if (user == null) {
      return res.status(200).json({ message: `${req.query.username} is available.` })
    }
    return res.status(400).json({ errors: { username: "Username already taken." } })
  } catch (err: any) {
    res.status(500).json({ errors: { username: "Username already taken." } })
  }
}
