import User from "../models/user.model"
import { weaviateClient } from "../server"
import { Filters } from "weaviate-client"
import { LocationType } from "../types/location.type"
import { dotProduct } from "./embedding"
import { MAX_POST_MATCHES_PER_USER } from "./constants"

// Bread and butter of the app. How we get matches per post.
// We match the provide embedding of our post, with need embeddings of others' posts.
// Same with our need embedding getting matched with others' provide embedding.
// We also apply a geo location filter, to only get matches for the user selected area.
export async function getClosestPosts(params: {
  userId: string
  location: LocationType
  distance: number
  provideEmbedding: number[]
  needEmbedding: number[]
}) {
  if (!weaviateClient) {
    throw new Error("Weaviate client not initialized")
  }

  const { userId, location, distance, provideEmbedding, needEmbedding } = params

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
      includeVector: true,
    }
  )

  // Step 2: For each result, calculate true dot product similarity
  let results = closePosts.objects.map(doc => {
    const docNeedEmbedding = doc.vectors.needEmbedding as number[]
    const docProvideEmbedding = doc.vectors.provideEmbedding as number[]

    const similarity1 = dotProduct(provideEmbedding, docNeedEmbedding)
    const similarity2 = dotProduct(needEmbedding, docProvideEmbedding)
    const finalScore = (similarity1 + similarity2) / 2

    return {
      score: finalScore,
      ...doc,
    }
  })

  // Sort results by score descending
  results = results.sort((a, b) => b.score - a.score)
  results = results.slice(0, MAX_POST_MATCHES_PER_USER)

  const res = []

  for (const result of results) {
    const matchPostId = result.properties.postId!.toString()
    const matchUserId = result.properties.userId!.toString()
    const matchingPost = await User.findById(matchUserId).then(user => user?.posts.id(matchPostId))
    if (!matchingPost) continue
    res.push({
      postId: matchPostId,
      userId: matchUserId,
      title: matchingPost.title,
      distance: -result.metadata!.distance!, // weaviate returns a negative value, so we negate that
      score: result.score,
    })

    // update the matchingPost's closestPosts to include this newly created post. Sort that list and then if the length exceeds K, remove the one with the lowest score (i.e. pop from list).
    const matchingPostClosestPosts = [...(matchingPost.closestPosts ?? [])]

    const existingIndex = matchingPostClosestPosts.findIndex(
      p => p.postId === result.properties.postId!.toString()
    )
    if (existingIndex !== -1) {
      continue
    }

    matchingPostClosestPosts.push({
      postId: result.properties.postId!.toString(),
      userId: result.properties.userId!.toString(),
      score: result.score,
    })

    matchingPostClosestPosts.sort((a, b) => b.score - a.score)

    if (matchingPostClosestPosts.length > MAX_POST_MATCHES_PER_USER) {
      matchingPostClosestPosts.pop()
    }

    await User.updateOne(
      { _id: matchUserId, "posts._id": matchPostId },
      { $set: { "posts.$.closestPosts": matchingPostClosestPosts } }
    )
  }

  return res
}
