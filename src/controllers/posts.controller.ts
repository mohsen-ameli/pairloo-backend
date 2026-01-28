import { Request, Response } from "express"
import User from "../models/user.model"
import { S3Object } from "../models/s3Object.model"
import mongoose from "mongoose"
import { getObject } from "../utils/s3"

export async function postListGet(req: Request, res: Response) {
  interface ProjectedDocument {
    posts: Array<{
      _id: string
      content: string
      createdAt: Date
    }>
  }

  const userId = req.user!.sub

  const posts = await User.findOne<ProjectedDocument>({ _id: userId }).select(
    "posts._id posts.content posts.createdAt"
  )

  if (!posts) {
    return res.status(404).json({ message: "User not found" })
  }

  posts.posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  res.status(200).json(posts.posts)
}

// Get a specific post belonging to the user
export async function myPostGet(req: Request, res: Response) {
  interface ProjectedDocument {
    _id: string
    username: string
    firstName: string
    lastName: string
    picture?: S3Object | null
    images: S3Object[]
    content: string
    summary: string
    createdAt: Date
    closestPosts: Array<{
      item: string
      _id: string
      picture?: S3Object | null
      username: string
      firstName: string
      lastName: string
      content: string
      images?: S3Object[] | null
      score: number
      createdAt: Date
    }>
  }

  const postId = req.params.id as string
  const userId = req.user!.sub

  const post = await User.aggregate<ProjectedDocument>([
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
        content: "$posts.content",
        summary: "$posts.summary",
        images: "$posts.images",
        createdAt: "$posts.createdAt",
        closestPosts: "$posts.closestPosts",
      },
    },
  ]).then(results => results[0])

  const images = []
  if (post.images && post.images.length != 0) {
    for (const img of post.images) {
      const url = await getObject(img)
      images.push(url)
    }
  }

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

    const images = []
    if (closePost.posts[0].images && closePost.posts[0].images.length != 0) {
      for (const img of closePost.posts[0].images) {
        const url = await getObject(img)
        images.push(url)
      }
    }

    closestPosts.push({
      score: p.score,
      _id: p._id,
      username: closePost.username,
      firstName: closePost.firstName,
      lastName: closePost.lastName,
      picture: closePost.picture,
      content: closePost.posts[0].content,
      summary: closePost.posts[0].summary,
      images,
      createdAt: closePost.posts[0].createdAt,
    })
  }

  if (!post) {
    return res.status(404).json({ message: "Post not found" })
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
    picture?: S3Object | null
    content: string
    summary: string
    images: S3Object[]
    createdAt: Date
  }
  const postId = req.params.id as string

  const userPost = await User.aggregate<ProjectedDocument>([
    { $match: { "posts._id": new mongoose.Types.ObjectId(postId) } },
    { $unwind: "$posts" },
    {
      $project: {
        _id: 1,
        username: 1,
        firstName: 1,
        lastName: 1,
        picture: 1,
        content: "$posts.content",
        summary: "$posts.summary",
        images: "$posts.images",
        createdAt: "$posts.createdAt",
        closestPosts: "$posts.closestPosts",
      },
    },
  ]).then(results => results[0])

  res.status(200).json(userPost)
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
