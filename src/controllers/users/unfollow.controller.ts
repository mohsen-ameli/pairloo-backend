import { Request, Response } from "express"
import User from "../../models/user.model"

export async function unfollowUser(req: Request, res: Response) {
  const myId = req.user!.sub
  const userId = req.body.id as string

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" })
  }

  try {
    const op1 = await User.findByIdAndUpdate(
      userId,
      { $pull: { followers: myId } },
      { returnDocument: "after", select: "followers" }
    )

    const op2 = await User.findByIdAndUpdate(
      myId,
      { $pull: { following: userId } },
      { returnDocument: "after", select: "following" }
    )

    if (!op1 || !op2) {
      return res.status(404).json({ error: "User not found" })
    }
  } catch (err) {
    console.error("Error in unfollow:", err)
    return res.status(500).json({ error: "Failed to connect. Please try again later." })
  }

  return res.json({ success: true })
}
