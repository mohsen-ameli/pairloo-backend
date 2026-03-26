import { Request, Response } from "express"
import User, { UserType } from "../../models/user.model"
import mongoose from "mongoose"

export async function userGet(req: Request, res: Response) {
  const userId = req.user!.sub

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" })
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user ID" })
  }

  const userAggregate = await User.aggregate<UserType>([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $project: {
        _id: 1,
        username: 1,
        firstName: 1,
        lastName: 1,
        picture: 1,
        phoneNumber: 1,
        country: 1,
        city: 1,
        state: 1,
        latitude: 1,
        longitude: 1,
        timezone: 1,
        locationId: 1,
        email: 1,
        followersCount: { $size: { $ifNull: ["$followers", []] } },
        followingCount: { $size: { $ifNull: ["$following", []] } },
        ratingCount: { $size: { $ifNull: ["$ratings", []] } },
        ratingAvg: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$ratings", []] } }, 0] },
            { $avg: "$ratings.rating" },
            0,
          ],
        },
        reviews: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ])

  const user = userAggregate[0]

  if (!user) {
    return res.status(404).json({ error: "User not found" })
  }

  await User.updateUserPicture(user)

  return res.json(user)
}
