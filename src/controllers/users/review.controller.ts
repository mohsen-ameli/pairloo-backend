import { Request, Response } from "express"
import User from "../../models/user.model"
import mongoose from "mongoose"

export async function reviewUser(req: Request, res: Response) {
  const myId = req.user!.sub
  const { userId, rating, review } = req.body

  if (!userId || typeof rating !== "number" || rating < 0 || rating > 5) {
    return res.status(400).json({ message: "Invalid request body" })
  }

  try {
    const userToReview = await User.findById(userId)
    if (!userToReview) {
      return res.status(404).json({ message: "User not found" })
    }

    const existingReviewIndex = userToReview.reviews.findIndex(r => r.userId.toString() === myId)
    if (existingReviewIndex !== -1) {
      // Update existing review
      userToReview.reviews[existingReviewIndex].rating = rating
      userToReview.reviews[existingReviewIndex].review = review
      await userToReview.save()
    } else {
      // Add new review
      await User.updateOne(
        { _id: userId },
        {
          $push: {
            reviews: {
              userId: new mongoose.Types.ObjectId(myId),
              rating,
              review,
            },
          },
        }
      )
    }

    return res.status(200).json({ message: "Review submitted successfully" })
  } catch (error) {
    console.error("Error submitting review:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
