import { Request, Response } from "express"
import User from "../models/user.model"
import mongoose from "mongoose"
import { weaviateClient } from "../server"
import { generateUuid5 } from "weaviate-client"

// Get a specific post belonging to any user
export async function myPostGet(req: Request, res: Response) {
  const postId = req.params.id as string
  const userId = req.user!.sub

  const user = await User.findById(userId)
  const post = user?.posts.id(postId)

  if (!post) {
    return res.status(404).json({ message: "Post not found" })
  }

  await User.updateUserPostImages(post)

  const closestPosts = []

  for (const p of post.closestPosts || []) {
    const closeUser = await User.findById(p.userId)
    const closePost = closeUser?.posts.id(p.postId)

    // The matching post has been deleted, so we remove the reference to it from the closestPosts array
    if (!closeUser || !closePost) {
      await User.updateOne(
        { _id: userId, "posts._id": postId },
        { $pull: { "posts.$.closestPosts": { postId: p.postId, userId: p.userId } } }
      )
      continue
    }

    await User.updateUserPostImages(closePost)
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

  res.status(200).json({
    _id: post._id.toString(),
    images: post.images,
    title: post.title,
    description: post.description,
    publicPost: post.publicPost,
    numMatches: post.numMatches,
    qna: post.qna,
    createdAt: post.createdAt,
    location: post.location,
    distance: post.distance,
    closestPosts,
  })
}

// Get a post by ID (public)
export async function postGet(req: Request, res: Response) {
  interface ProjectedDocument {
    _id: string
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

  const userPosts = await User.aggregate<ProjectedDocument>([
    { $match: { "posts._id": new mongoose.Types.ObjectId(postId) } },
    { $unwind: "$posts" },
    { $match: { "posts._id": new mongoose.Types.ObjectId(postId) } },
    {
      $project: {
        _id: 1,
        username: 1,
        firstName: 1,
        lastName: 1,
        picture: 1,
        postId: "$posts._id",
        title: "$posts.title",
        description: "$posts.description",
        images: "$posts.images",
        createdAt: "$posts.createdAt",
        location: "$posts.location",
        distance: "$posts.distance",
      },
    },
  ])

  await User.updateUserPostImages(userPosts[0] as any)
  await User.updateUserPicture(userPosts[0] as any)

  res.status(200).json(userPosts[0])
}

export async function postDelete(req: Request, res: Response) {
  const postId = req.params.id as string
  const userId = req.user!.sub

  if (!weaviateClient) {
    return res.status(500).json({ message: "Weaviate client not initialized" })
  }

  const user = await User.findById(userId).select("posts")
  if (!user) {
    return res.status(404).json({ message: "User not found" })
  }

  await User.updateOne({ _id: userId }, { $pull: { posts: { _id: postId } } })

  const weaviatePosts = weaviateClient.collections.use("Post")

  await weaviatePosts.data.deleteById(generateUuid5(postId))

  res.status(200).json({ message: "Post deleted successfully" })
}
