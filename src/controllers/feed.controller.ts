import { Request, Response } from "express"
import User from "../models/user.model"
import Post from "../models/post.model"

export async function feedGet(req: Request, res: Response) {
  const userId = req.user!.sub

  try {
    const posts = await Post.find({ userId: { $ne: userId } })
      .select("userId title images createdAt")
      .populate<{
        userId: {
          username: string
          firstName: string
          lastName: string
          picture: string
        }
      }>({
        path: "userId",
        select: "username firstName lastName picture",
      })
    const results = []

    for (const post of posts) {
      await Post.updatePostImages(post)
      await User.updateUserPicture(post.userId)
      const user = post.userId
      results.push({
        _id: post._id,
        title: post.title,
        images: post.images,
        createdAt: post.createdAt,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
      })
    }

    return res.status(200).json(results)
  } catch (error) {
    console.error("Error fetching feed:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
