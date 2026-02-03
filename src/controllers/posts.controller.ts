import { Request, Response } from "express"
import User from "../models/user.model"
import mongoose from "mongoose"
import { QnaType } from "../types/session.types"

export async function postListGet(req: Request, res: Response) {
  interface ProjectedDocument {
    posts: Array<{
      _id: string
      title: string
      content: string
      createdAt: Date
      images?: string[]
      isDraft?: boolean
      closestPosts?: Array<{ score: number; item: string }>
    }>
  }

  const userId = req.user!.sub

  const posts = await User.findOne<ProjectedDocument>({ _id: userId }).select(
    "posts._id posts.title posts.content posts.createdAt posts.images posts.isDraft posts.closestPosts"
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

  interface MyPostType {
    _id: string
    postId: string
    username: string
    firstName: string
    lastName: string
    picture?: string | null
    images: string[]
    content: string
    summary: string
    qna: QnaType
    createdAt: Date
    closestPosts: Array<{
      item: string
      _id: string
      picture?: string | null
      username: string
      firstName: string
      lastName: string
      content: string
      images?: string[] | null
      score: number
      createdAt: Date
    }>
  }

  const post = await User.aggregate<MyPostType>([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
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
        content: "$posts.content",
        summary: "$posts.summary",
        images: "$posts.images",
        qna: "$posts.qna",
        createdAt: "$posts.createdAt",
        closestPosts: "$posts.closestPosts",
      },
    },
  ]).then(results => results[0])

  if (!post) {
    return res.status(404).json({ message: "Post not found" })
  }

  await User.updateUserPostImages(post as any)

  const closestPosts = []

  for (const p of post.closestPosts || []) {
    const closePost = await User.findOne(
      { "posts._id": p.item },
      {
        "posts.$": 1,
        username: 1,
        firstName: 1,
        lastName: 1,
        picture: 1,
      }
    )
    if (!closePost) continue

    await User.updateUserPostImages(closePost.posts[0] as any)
    await User.updateUserPicture(closePost as any)

    closestPosts.push({
      score: p.score,
      _id: p.item,
      username: closePost.username,
      firstName: closePost.firstName,
      lastName: closePost.lastName,
      picture: closePost.picture,
      content: closePost.posts[0].content,
      summary: closePost.posts[0].summary,
      title: closePost.posts[0].title,
      images: closePost.posts[0].images,
      createdAt: closePost.posts[0].createdAt,
    })
  }

  res.status(200).json({ ...post, closestPosts })
}

// Get a post by ID (public)
export async function postGet(req: Request, res: Response) {
  interface ProjectedDocument {
    _id: string
    username: string
    firstName: string
    lastName: string
    picture?: string | null
    content: string
    summary: string
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
        content: "$posts.content",
        summary: "$posts.summary",
        images: "$posts.images",
        createdAt: "$posts.createdAt",
      },
    },
  ])

  await User.updateUserPostImages(userPosts[0] as any)
  await User.updateUserPicture(userPosts[0] as any)

  res.status(200).json(userPosts[0])
}

export async function postDelete(req: Request, res: Response) {
  const postId = req.params.id
  const userId = req.user!.sub

  const user = await User.findById(userId).select("posts")
  if (!user) {
    return res.status(404).json({ message: "User not found" })
  }

  await User.updateOne({ _id: userId }, { $pull: { posts: { _id: postId } } })
  res.status(200).json({ message: "Post deleted successfully" })
}
