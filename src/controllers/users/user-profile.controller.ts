import { Request, Response } from "express"
import User from "../../models/user.model"
import mongoose from "mongoose"
import { PostType } from "../../models/post.model"

type UserProfileType = {
  username: string
  firstName: string
  lastName: string
  picture: string
  phoneNumber: string
  country: string
  city: string
  state: string
  latitude: number
  longitude: number
  timezone: string
  email: string
  posts: PostType[]
  followersCount: number
  followingCount: number
  createdAt: Date
  updatedAt: Date
}

export async function userProfileGet(req: Request, res: Response) {
  const myId = req.user!.sub
  const userId = req.params.id as string

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" })
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user ID" })
  }

  try {
    const userAggregate = await User.aggregate([
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
                images: "$$post.images",
                createdAt: "$$post.createdAt",
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
          isFollowing: {
            $in: [new mongoose.Types.ObjectId(myId), "$followers"],
          },
        },
      },
      {
        $project: {
          posts: 1,
          username: 1,
          firstName: 1,
          lastName: 1,
          picture: 1,
          createdAt: 1,
          followersCount: 1,
          followingCount: 1,
          isFollowing: 1,
        },
      },
    ])

    const user = userAggregate[0] as UserProfileType

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    await User.updateUserPicture(user)

    for (const post of user.posts) {
      await User.updateUserPostImages(post)
    }

    return res.json(user)
  } catch (error) {
    console.error("Error in user profile:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
