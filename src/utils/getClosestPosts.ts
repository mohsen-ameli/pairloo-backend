import User from "../models/user.model"
import { weaviateClient } from "../server"
import { Filters } from "weaviate-client"
import { LocationType } from "../types/location.type"
import { MAX_POST_MATCHES_PER_USER } from "./constants"
import { sendPushNotification } from "./send-push-notification"
import Post, { PostType } from "../models/post.model"
import mongoose, { AnyBulkWriteOperation } from "mongoose"

// Bread and butter of the app. How we get matches per post.
// We match the provide embedding of our post, with need embeddings of others' posts.
// Same with our need embedding getting matched with others' provide embedding.
// We also apply a geo location filter, to only get matches for the user selected area.
export async function getClosestPosts({
  userId,
  postId,
  location,
  distance,
  provideEmbedding,
  needEmbedding,
}: {
  userId: mongoose.Types.ObjectId
  postId: mongoose.Types.ObjectId
  location: LocationType
  distance: number
  provideEmbedding: number[]
  needEmbedding: number[]
}) {
  if (!weaviateClient) {
    throw new Error("Weaviate client not initialized")
  }

  const currentPost = await Post.findById(postId).select("closestPosts")
  if (!currentPost) {
    throw new Error("Current post not found")
  }

  const weaviatePosts = weaviateClient.collections.use("Post")

  const userFilter = weaviatePosts.filter.byProperty("userId").notEqual(userId.toString())

  const filters = location
    ? Filters.and(
        userFilter,
        weaviatePosts.filter.byProperty("location").withinGeoRange({
          latitude: location.latitude,
          longitude: location.longitude,
          distance: distance + 5000, // in meters (5km padding)
        })
      )
    : userFilter

  const closePosts = await weaviatePosts.query.nearVector(
    {
      needEmbedding: provideEmbedding,
      provideEmbedding: needEmbedding,
    },
    {
      filters,
      limit: MAX_POST_MATCHES_PER_USER,
      returnMetadata: ["distance"],
    }
  )

  const res: {
    postId: mongoose.Types.ObjectId
    userId: mongoose.Types.ObjectId
    title: string
    score: number
  }[] = []
  const bulkUpdates: AnyBulkWriteOperation<PostType>[] = []

  for (const closePost of closePosts.objects) {
    const matchPostId = new mongoose.Types.ObjectId(closePost.properties.postId!.toString())
    const matchUserId = new mongoose.Types.ObjectId(closePost.properties.userId!.toString())
    const matchScore = -closePost.metadata!.distance! // weaviate returns a negative value, so we negate that
    const matchingUser = await User.findById(matchUserId).select("expoPushToken")
    const matchingPost = await Post.findById(matchPostId).select("title closestPosts")
    if (!matchingPost || !matchingUser) continue

    res.push({
      postId: matchPostId,
      userId: matchUserId,
      title: matchingPost.title,
      score: matchScore,
    })

    // if this post is not already in their closestPosts
    if (!matchingPost.closestPosts?.some(match => match.postId.toString() === postId.toString())) {
      // Send a notification to the matching user about the new match.
      await sendPushNotification(
        matchingUser.expoPushToken,
        "New Match Found!",
        `Your post "${matchingPost.title}" has a new match with a score of ${(matchScore * 100).toFixed(0)}%`
      )

      // update the matchingPost's closestPosts to include this newly created post. Sort that list and then if the length exceeds MAX_POST_MATCHES_PER_USER, remove the one with the lowest score (i.e. pop from list).
      bulkUpdates.push({
        updateOne: {
          filter: { _id: matchPostId },
          update: {
            $push: {
              closestPosts: {
                $each: [{ postId, userId, score: matchScore }],
                $sort: { score: -1 },
                $slice: MAX_POST_MATCHES_PER_USER,
              },
            },
          },
        },
      })
    }
  }

  // Update the current post's closestPosts with the new matches. We add whatever post is already in the closestPost array, plus the posts that we found from weaviate. Then we sort by score and slice to ensure we only keep the top MAX_POST_MATCHES_PER_USER matches.
  const currentPostClosestPosts = [...res, ...currentPost.closestPosts]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_POST_MATCHES_PER_USER)
    .map(({ postId, userId, score }) => ({
      postId,
      userId,
      score,
    }))

  bulkUpdates.push({
    updateOne: {
      filter: { _id: postId },
      update: { $set: { closestPosts: currentPostClosestPosts } },
    },
  })

  await Post.bulkWrite(bulkUpdates)

  return res
}
