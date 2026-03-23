import { Request, Response } from "express"
import User from "../../models/user.model"

export async function followUser(req: Request, res: Response) {
  const myId = req.user!.sub
  const userId = req.body.id as string

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" })
  }

  const op1 = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { followers: myId } },
    { returnDocument: "after", select: "followers" }
  )

  const op2 = await User.findByIdAndUpdate(
    myId,
    { $addToSet: { following: userId } },
    { returnDocument: "after", select: "following" }
  )

  if (!op1 || !op2) {
    return res.status(404).json({ error: "User not found" })
  }

  return res.json({ success: true })
}
