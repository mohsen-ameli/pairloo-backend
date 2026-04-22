import User from "../models/user.model"
import { weaviateClient } from "../server"
import { Types } from "mongoose"
import { Filters } from "weaviate-client"
import { LocationType } from "../types/location.type"
import { MAX_POST_MATCHES_PER_USER } from "./constants"

// Bread and butter of the app. How we get matches per post.
// We match the provide embedding of our post, with need embeddings of others' posts.
// Same with our need embedding getting matched with others' provide embedding.
// We also apply a geo location filter, to only get matches for the user selected area.
export async function getClosestPosts(params: {
  userId: string
  postId: string
  location: LocationType
  distance: number
  provideEmbedding: number[]
  needEmbedding: number[]
}) {
  if (!weaviateClient) {
    throw new Error("Weaviate client not initialized")
  }

  const { userId, postId, location, distance, provideEmbedding, needEmbedding } = params
  const currentPostId = new Types.ObjectId(postId)
  const currentUserId = new Types.ObjectId(userId)

  const weaviatePosts = weaviateClient.collections.use("Post")

  const userFilter = weaviatePosts.filter.byProperty("userId").notEqual(userId)

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

  const res = []
  const bulkUpdates = []

  for (const closePost of closePosts.objects) {
    const matchPostId = closePost.properties.postId!.toString()
    const matchUserId = closePost.properties.userId!.toString()
    const matchPostObjectId = new Types.ObjectId(matchPostId)
    const matchScore = -closePost.metadata!.distance! // weaviate returns a negative value, so we negate that
    const matchingPost = await User.findById(matchUserId).then(user => user?.posts.id(matchPostId))
    if (!matchingPost) continue
    res.push({
      postId: matchPostId,
      userId: matchUserId,
      title: matchingPost.title,
      score: matchScore,
    })

    // update the matchingPost's closestPosts to include this newly created post. Sort that list and then if the length exceeds MAX_POST_MATCHES_PER_USER, remove the one with the lowest score (i.e. pop from list).
    bulkUpdates.push({
      updateOne: {
        filter: { _id: matchUserId, "posts._id": matchPostObjectId },
        update: {
          $push: {
            "posts.$[post].closestPosts": {
              $each: [
                {
                  postId: currentPostId,
                  userId: currentUserId,
                  score: matchScore,
                },
              ],
              $sort: { score: -1 },
              $slice: MAX_POST_MATCHES_PER_USER,
            },
          },
        },
        arrayFilters: [
          {
            "post._id": matchPostObjectId,
            "post.closestPosts": {
              $not: {
                $elemMatch: {
                  postId: currentPostId,
                },
              },
            },
          },
        ],
      },
    })
  }

  // Update the current post's closestPosts with the new matches. Again, sort and slice to ensure we only keep the top MAX_POST_MATCHES_PER_USER matches.
  const currentPostClosestPosts = [...res]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_POST_MATCHES_PER_USER)
    .map(({ postId, userId, score }) => ({
      postId,
      userId,
      score,
    }))

  bulkUpdates.push({
    updateOne: {
      filter: { _id: currentUserId, "posts._id": currentPostId },
      update: {
        $set: {
          "posts.$.closestPosts": currentPostClosestPosts,
        },
      },
    },
  })

  await User.bulkWrite(bulkUpdates)

  return res
}
