import User from "../models/user.model"
import { weaviateClient } from "../server"
import { Filters } from "weaviate-client"
import { LocationType } from "../types/location.type"
import { dotProduct } from "./embedding"

// Bread and butter of the app. How we get matches per post.
// We match the provide embedding of our post, with need embeddings of others' posts.
// Same with our need embedding getting matched with others' provide embedding.
// We also apply a geo location filter, to only get matches for the user selected area.
export async function getClosestPosts(params: {
  userId: string
  location: LocationType
  distance: number
  K: number
  provideEmbedding: number[]
  needEmbedding: number[]
}) {
  if (!weaviateClient) {
    throw new Error("Weaviate client not initialized")
  }

  const { userId, location, distance, K, provideEmbedding, needEmbedding } = params

  const weaviatePosts = weaviateClient.collections.use("Post")

  const closePosts = await weaviatePosts.query.nearVector(
    {
      needEmbedding: provideEmbedding,
      provideEmbedding: needEmbedding,
    },
    {
      filters: Filters.and(
        weaviatePosts.filter.byProperty("userId").notEqual(userId),
        weaviatePosts.filter.byProperty("location").withinGeoRange({
          latitude: location.latitude,
          longitude: location.longitude,
          distance: distance,
        })
      ),
      limit: K,
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
  results = results.slice(0, K)

  const res = []

  for (const result of results) {
    const matchPostId = result.properties.postId!.toString()
    const matchUserId = result.properties.userId!.toString()
    const originalPost = await User.findById(matchUserId).then(user => user?.posts.id(matchPostId))
    res.push({
      postId: matchPostId,
      userId: matchUserId,
      title: originalPost?.title,
      initialPostText: originalPost?.initialPostText,
      distance: -result.metadata!.distance!, // weaviate returns a negative value, so we negate that
      score: result.score,
    })
  }

  return res
}
