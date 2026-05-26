import { Request, Response } from "express"
import Feedback from "../../models/feedback.model"

export async function submitFeedback(req: Request, res: Response) {
  const myId = req.user!.sub
  const { title, description } = req.body

  if (!title || typeof title !== "string" || !description || typeof description !== "string") {
    return res.status(400).json({ message: "Invalid request body" })
  }

  try {
    await Feedback.create({
      userId: myId,
      title,
      description,
    })

    return res.status(200).json({ message: "Feedback submitted successfully" })
  } catch (error) {
    console.error("Error submitting feedback:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
