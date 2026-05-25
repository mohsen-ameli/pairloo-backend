import { Request, Response } from "express"
import Post, { StatusType } from "../models/post.model"
import Interaction, { InteractionTypeEnum } from "../models/interaction.model"
import { weaviateClient } from "../server"
import { generateUuid5 } from "weaviate-client"
import User from "../models/user.model"
import { IS_PRODUCTION } from "../utils/constants"

const WEIGHTS: {
  [key in InteractionTypeEnum]: number
} = { contact: 1.0, save: 0.8, profile_view: 0.4, post_view: 0.1 }

type GeneralPostType = {
  _id: string // postId
  userId: string
  username: string
  firstName: string
  lastName: string
  picture?: string | null
  title: string
  description: string
  images?: string[] | null | undefined
  createdAt: Date
  location?: {
    latitude: number
    longitude: number
  }
  distance?: number
  score: number
  status?: StatusType
}

async function getColdStartPosts(userId: string, res: Response) {
  const recentPosts = await Post.find({
    userId: { $ne: userId },
    publicPost: true,
    status: { $nin: ["inactive", "hidden", "draft"] },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("_id title description images createdAt status")
    .populate<{
      userId: {
        _id: string
        username: string
        firstName: string
        lastName: string
        picture: string
      }
    }>("userId", "_id username firstName lastName picture")
    .lean()

  await User.updateUserPicture(recentPosts.map(p => p.userId))

  for (const post of recentPosts) {
    await Post.updatePostImages(post)
  }

  const results = recentPosts.map(post => ({
    _id: post._id.toString(),
    title: post.title,
    description: post.description,
    images: post.images,
    createdAt: post.createdAt,
    status: post.status,
    userId: post.userId._id,
    username: post.userId.username,
    firstName: post.userId.firstName,
    lastName: post.userId.lastName,
    picture: post.userId.picture,
  }))

  return res.status(200).json(results)
}

export async function feedGet(req: Request, res: Response) {
  const userId = req.user!.sub

  if (!IS_PRODUCTION) {
    return await getColdStartPosts(userId, res)
  }

  if (!weaviateClient) {
    return res.status(500).json({ message: "Something went wrong!" })
  }

  try {
    const interactionCount = await Interaction.countDocuments({ userId })

    // Cold start: return trending/recent posts
    if (interactionCount < 5) {
      return await getColdStartPosts(userId, res)
    }

    const interestVector = await buildUserInterestVector(userId)

    // Get IDs of posts already seen (to exclude)
    // const seenIds = await Interaction.distinct('postId', { userId, type: 'view' }).then(ids => ids.map(id => id.toString()));

    const weaviatePosts = weaviateClient.collections.use("Post")

    const result = await weaviatePosts.query.nearVector(
      {
        generalEmbedding: interestVector,
      },
      {
        returnMetadata: ["distance"],
        // filters: weaviatePosts.filter.byId().notEqual(seenIds)
        filters: weaviatePosts.filter.byProperty("userId").notEqual(userId),
        limit: 20,
        offset: 0,
      }
    )

    let posts: { [postId: string]: { score: number } } = {}
    let postIds: string[] = []
    for (const obj of result.objects) {
      if (!obj.metadata) continue
      posts[obj.properties.postId as string] = {
        score: obj.metadata.distance!,
      }
      postIds.push(obj.properties.postId as string)
    }

    const fullPosts = await Post.find({
      _id: { $in: postIds },
      publicPost: true,
      status: { $ne: "draft" },
    })
      .select("_id title description images createdAt status")
      .populate<{
        userId: {
          _id: string
          username: string
          firstName: string
          lastName: string
          picture: string
        }
      }>("userId", "_id username firstName lastName picture")
      .lean()

    let results: GeneralPostType[] = []

    for (const post of fullPosts) {
      await User.updateUserPicture([post.userId])
      await Post.updatePostImages(post)

      results.push({
        _id: post._id.toString(),
        title: post.title,
        description: post.description,
        images: post.images,
        createdAt: post.createdAt,
        status: post.status,
        userId: post.userId._id,
        username: post.userId.username,
        firstName: post.userId.firstName,
        lastName: post.userId.lastName,
        picture: post.userId.picture,
        score: posts[post._id.toString()].score,
      })
    }

    results.sort((a, b) => a.score - b.score)

    return res.status(200).json(results)
  } catch (error) {
    console.error("Error fetching feed:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}

async function buildUserInterestVector(userId: string) {
  // 1. Fetch recent interactions from MongoDB (last N or last 30 days)
  const interactions = await Interaction.find({ userId }).sort({ createdAt: -1 }).limit(100)

  // 2. Fetch the Weaviate vector for each interacted post
  const weightedVectors = await Promise.all(
    interactions.map(async interaction => {
      const weaviatePosts = weaviateClient!.collections.use("Post")

      const result = await weaviatePosts.query.fetchObjectById(
        generateUuid5(interaction.postId.toString()),
        {
          includeVector: true,
        }
      )
      if (!result) return null

      const freqMultiplier = Math.log1p(interaction.count)
      return {
        vector: result.vectors.generalEmbedding,
        weight: WEIGHTS[interaction.type] * freqMultiplier,
      }
    })
  )

  // 3. Weighted average across all vectors
  const validVectors = weightedVectors.filter(v => v !== null)
  const dimension = validVectors[0].vector.length
  const sumVec = new Array(dimension).fill(0)
  let totalWeight = 0

  for (const { vector, weight } of validVectors) {
    for (let i = 0; i < dimension; i++) {
      sumVec[i] += Number(vector[i]) * weight
    }
    totalWeight += weight
  }

  return sumVec.map(v => v / totalWeight) // normalized interest vector
}
