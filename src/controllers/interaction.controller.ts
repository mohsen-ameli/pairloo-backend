import { Request, Response } from "express"
import Interaction from "../models/interaction.model"

export async function postInteraction(req: Request, res: Response) {
  const userId = req.user!.sub
  const postId = req.body.postId
  const type = req.body.type

  const validTypes = ["post_view", "profile_view", "contact", "save"]
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: "Invalid interaction type" })
  }

  try {
    await Interaction.findOneAndUpdate(
      { userId, postId, type },
      {
        $inc: { count: 1 },
        $set: { updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    )

    return res.status(200).json({ message: "Interaction recorded" })
  } catch (error) {
    console.error("Error handling interaction:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
