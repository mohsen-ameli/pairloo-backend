import { Request, Response } from "express"
import User from "../models/user.model"
import mongoose from "mongoose"
import { weaviateClient } from "../server"
import { generateUuid5 } from "weaviate-client"

export async function postListGet(req: Request, res: Response) {
  interface ProjectedDocument {
    posts: Array<{
      _id: string
      title: string
      initialPostText: string
      createdAt: Date
      images: string[]
      isDraft: boolean
      publicPost: boolean
      closestPosts?: Array<{ score: number; item: string }>
    }>
  }

  const userId = req.user!.sub

  const posts = await User.findOne<ProjectedDocument>({ _id: userId }).select(
    "posts._id posts.title posts.initialPostText posts.createdAt posts.images posts.isDraft posts.publicPost posts.closestPosts"
  )

  for (const post of posts?.posts || []) {
    await User.updateUserPostImages(post as any)
  }

  if (!posts) {
    return res.status(404).json({ message: "User not found" })
  }

  posts.posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  res.status(200).json(posts.posts)
}

// Get a specific post belonging to the user
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
      initialPostText: closePost.initialPostText,
      title: closePost.title,
      images: closePost.images,
      createdAt: closePost.createdAt,
    })
  }

  res.status(200).json({
    _id: post._id.toString(),
    images: post.images,
    title: post.title,
    publicPost: post.publicPost,
    numMatches: post.numMatches,
    initialPostText: post.initialPostText,
    qna: post.qna,
    createdAt: post.createdAt,
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
    initialPostText: string
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
        initialPostText: "$posts.initialPostText",
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
