import User from "../models/user.model"
import { weaviateClient } from "../server"
import { Filters } from "weaviate-client"
import { LocationType } from "../types/location.type"

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

  const results = await weaviatePosts.query.nearVector(
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
    }
  )

  const res = []

  for (const result of results.objects) {
    const matchPostId = result.properties.postId!.toString()
    const matchUserId = result.properties.userId!.toString()
    const originalPost = await User.findById(matchUserId).then(user => user?.posts.id(matchPostId))
    res.push({
      postId: matchPostId,
      userId: matchUserId,
      title: originalPost?.title,
      initialPostText: originalPost?.initialPostText,
      score: -result.metadata!.distance!, // weaviate returns a negative value, so we negate that
    })
  }

  return res
}
