import mongoose from "mongoose"
import { PostType } from "../models/post.model"
import User from "../models/user.model"
import { cosineSimilarity } from "./embedding"
import { ClosePost } from "../types/closePost.types"

export async function getClosestPosts(
  userId: string,
  newPost: Partial<PostType>,
  K = 5
): Promise<ClosePost[]> {
  if (!newPost.embedding) {
    throw new Error("Post must have an embedding")
  }

  // Unwind posts, exclude posts from the same user, and perform vector search on posts
  const closePosts = await User.aggregate<{
    _id: mongoose.Types.ObjectId
    userId: mongoose.Types.ObjectId
    score: number
    content: string
    embedding: number[]
  }>([
    {
      $vectorSearch: {
        index: "post_embedding",
        exact: false,
        limit: K,
        numCandidates: K * 2,
        path: "posts.embedding",
        queryVector: newPost.embedding!,
        filter: {
          _id: {
            $ne: new mongoose.Types.ObjectId(userId), // Exclude posts from the same user
          },
        },
      },
    },
    { $unwind: "$posts" },
    {
      $project: {
        _id: "$posts._id",
        userId: "$_id",
        score: { $meta: "vectorSearchScore" },
        content: "$posts.content",
        embedding: "$posts.embedding",
      },
    },
  ])

  // Step 2: For each result, calculate true cosine similarity
  let results = closePosts.map(doc => {
    const score = cosineSimilarity(newPost.embedding!, doc.embedding!)
    return {
      item: doc._id,
      userId: doc.userId,
      atlasScore: doc.score,
      score,
      content: doc.content,
    }
  })

  // Sort results by score descending
  results = results.sort((a, b) => b.score - a.score)
  results = results.slice(0, K)

  // Add newPost to each of its closestPosts's closestPosts array
  for (const doc of results) {
    const postId = doc.item
    // if newPost isn't already in closestPosts's array of each of newPosts's closestPosts, add it
    const closeUser = await User.findById(doc.userId)
    const closePost = closeUser?.posts.find(p => p._id === postId)
    if (!closePost) continue

    // If newPost is already in closestPosts, skip
    if (!closePost.closestPosts || closePost.closestPosts.length == 0) continue
    for (const cp of closePost.closestPosts) {
      if (cp.item.toString() === (newPost as any).id?.toString()) {
        continue
      }
    }

    // Push, sort, and slice in one update
    await User.updateOne(
      { _id: doc.userId, "posts._id": postId },
      {
        $push: {
          "posts.$.closestPosts": {
            $each: [
              {
                item: (newPost as any)._id,
                score: doc.score,
              },
            ],
            $sort: { score: -1 },
            $slice: closePost.numMatches,
          },
        },
      }
    )
  }

  return results
}
