import { Request, Response } from "express"
import User from "../../models/user.model"
import mongoose from "mongoose"
import Post, { PostType, StatusType } from "../../models/post.model"

type UserProfileType = {
  username: string
  firstName: string
  lastName: string
  picture: string
  posts: Partial<PostType>[]
  followersCount: number
  followingCount: number
  createdAt: Date
}

// Public user profile
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
    const userAggregate = await User.aggregate<{
      username: string
      firstName: string
      lastName: string
      picture: string
      createdAt: Date
      followersCount: number
      followingCount: number
      isFollowing: boolean
    }>([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $project: {
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
    ])

    const posts = await Post.aggregate<{
      title: string
      description: string
      images: string[]
      createdAt: Date
      status: StatusType
    }>([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          publicPost: true,
          status: { $nin: ["Hidden", "Draft"] },
        },
      },
      { $project: { title: 1, description: 1, images: 1, createdAt: 1, status: 1 } },
      { $sort: { createdAt: -1 } },
    ])

    const user = userAggregate[0]

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    await User.updateUserPicture(user)

    for (const post of posts) {
      await Post.updatePostImages(post)
    }

    const results: UserProfileType = { ...user, posts }

    return res.json(results)
  } catch (error) {
    console.error("Error in user profile:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
