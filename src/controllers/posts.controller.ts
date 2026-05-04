import { Request, Response } from "express"
import User from "../models/user.model"
import mongoose from "mongoose"
import { weaviateClient } from "../server"
import { generateUuid5 } from "weaviate-client"
import Post from "../models/post.model"

// Get a specific post belonging to any user
export async function myPostGet(req: Request, res: Response) {
  const postId = req.params.id as string
  const userId = req.user!.sub

  try {
    const post = await Post.findOne({ _id: postId, userId })
      .select(
        "_id title description images publicPost qna createdAt location distance closestPosts"
      )
      .lean()

    if (!post) {
      return res.status(404).json({ message: "Post not found" })
    }

    await Post.updatePostImages(post)

    const closestPosts = []

    for (const p of post.closestPosts) {
      const closeUser = await User.findById(p.userId)
      const closePost = await Post.findById(p.postId)

      // The matching post has been deleted, so we remove the reference to it from the closestPosts array
      if (!closeUser || !closePost) {
        await Post.findByIdAndUpdate(postId, {
          $pull: { closestPosts: { postId: p.postId } },
        })
        continue
      }

      await Post.updatePostImages(closePost)
      await User.updateUserPicture(closeUser)

      closestPosts.push({
        postId: p.postId,
        userId: p.userId,
        score: p.score,
        username: closeUser.username,
        firstName: closeUser.firstName,
        lastName: closeUser.lastName,
        picture: closeUser.picture,
        title: closePost.title,
        description: closePost.description,
        images: closePost.images,
        createdAt: closePost.createdAt,
      })
    }

    return res.status(200).json({ ...post, closestPosts })
  } catch (error) {
    console.error("Error fetching post:", error)
    return res.status(500).json({ message: "An error occurred while fetching the post" })
  }
}

// Get a post by ID (public)
export async function postGet(req: Request, res: Response) {
  interface ProjectedDocument {
    _id: string
    userId: string
    username: string
    firstName: string
    lastName: string
    picture?: string | null
    title: string
    description: string
    location?: {
      type: string
      coordinates: [number, number]
    }
    distance?: number
    images: string[]
    createdAt: Date
  }
  const postId = req.params.id as string

  try {
    const posts = await Post.aggregate<ProjectedDocument>([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(postId),
          publicPost: true,
          isDraft: { $ne: true },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          location: 1,
          distance: 1,
          images: 1,
          createdAt: 1,
          userId: "$userDetails._id",
          username: "$userDetails.username",
          firstName: "$userDetails.firstName",
          lastName: "$userDetails.lastName",
          picture: "$userDetails.picture",
        },
      },
    ])

    if (posts.length === 0) {
      return res.status(404).json({ message: "Post not found or not public" })
    }

    const userPost = posts[0]

    await Post.updatePostImages(userPost)
    await User.updateUserPicture(userPost)

    return res.status(200).json(userPost)
  } catch (error) {
    console.error("Error fetching post:", error)
    return res.status(500).json({ message: "An error occurred while fetching the post" })
  }
}

export async function postDelete(req: Request, res: Response) {
  const postId = req.params.id as string
  const userId = req.user!.sub

  try {
    if (!weaviateClient) {
      return res.status(500).json({ message: "Weaviate client not initialized" })
    }

    await Post.findOneAndDelete({ _id: postId, userId })

    const weaviatePosts = weaviateClient.collections.use("Post")

    await weaviatePosts.data.deleteById(generateUuid5(postId))

    return res.status(200).json({ message: "Post deleted successfully" })
  } catch (error) {
    console.error("Error deleting post:", error)
    return res.status(500).json({ message: "An error occurred while deleting the post" })
  }
}
