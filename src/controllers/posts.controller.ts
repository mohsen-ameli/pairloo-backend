import { Request, Response } from "express"
import User from "../models/user.model"
import { getObject } from "../utils/s3"

export async function postListGet(req: Request, res: Response) {
  const userId = req.user!.sub

  const posts = await User.findById(userId)
    .select("posts")
    .then(user => user?.posts || [])
  posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  res.status(200).json(posts)
}

// Get a specific post belonging to the user
export async function myPostGet(req: Request, res: Response) {
  const postId = req.params.id as string
  const userId = req.user!.sub

  const user = await User.findById(userId).select("posts")
  if (!user) {
    return res.status(404).json({ message: "User not found" })
  }

  const post = user.posts.id(postId)
  if (!post) {
    return res.status(404).json({ message: "Post not found" })
  }

  const images = []
  if (post.images && post.images.length != 0) {
    for (const img of post.images) {
      const url = await getObject(img)
      images.push(url)
    }
  }

  const closestPosts = []

  for (const { score, item } of post.closestPosts || []) {
    const closePost = await User.findOne(
      { "posts._id": item },
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
      score,
      _id: item,
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

  res.status(200).json({
    _id: post._id,
    userId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    picture: user.picture,
    state: user.state,
    latitude: user.latitude,
    longitude: user.longitude,
    timezone: user.timezone,
    locationId: user.locationId,
    content: post.content,
    summary: post.summary,
    images,
    createdAt: post.createdAt,
    closestPosts,
  })
}

// Get a post by ID (public)
export async function postGet(req: Request, res: Response) {
  const postId = req.params.id as string

  const user = await User.findOne({ "posts._id": postId })

  if (!user) {
    return res.status(404).json({ message: "Post not found" })
  }
  const post = user.posts.id(postId)
  if (!post) {
    return res.status(404).json({ message: "Post not found" })
  }

  const images = []
  if (post.images && post.images.length != 0) {
    for (const img of post.images) {
      const url = await getObject(img)
      images.push(url)
    }
  }

  res.status(200).json({
    _id: user._id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    picture: user.picture,
    state: user.state,
    latitude: user.latitude,
    longitude: user.longitude,
    timezone: user.timezone,
    locationId: user.locationId,
    content: post.content,
    summary: post.summary,
    images,
    createdAt: post.createdAt,
  })
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
