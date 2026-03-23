import { Request, Response } from "express"
import User from "../../models/user.model"
import mongoose from "mongoose"

export async function userProfileGet(req: Request, res: Response) {
  const myId = req.user!.sub
  const userId = req.params.id as string

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" })
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user ID" })
  }

  const user = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $project: {
        posts: {
          $map: {
            input: {
              $filter: {
                input: "$posts",
                as: "post",
                cond: { $eq: ["$$post.publicPost", true] },
              },
            },
            as: "post",
            in: {
              _id: "$$post._id",
              title: "$$post.title",
              location: "$$post.location",
              images: "$$post.images",
            },
          },
        },
        username: 1,
        firstName: 1,
        lastName: 1,
        picture: 1,
        createdAt: 1,
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
        isFollowing: {
          $in: [new mongoose.Types.ObjectId(myId), "$followers"],
        },
      },
    },
  ])

  if (!user) {
    return res.status(404).json({ error: "User not found" })
  }

  await User.updateUserPicture(user)

  return res.json(user[0])
}
