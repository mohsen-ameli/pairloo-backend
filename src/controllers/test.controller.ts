import { getClosestPosts } from "../utils/getClosestPosts"
import { Request, Response } from "express"
import User, { UserType } from "../models/user.model"
import { weaviateClient } from "../server"
import { generateEmbedding } from "../utils/AIModel"
import { PostType } from "../models/post.model"
import { generateUuid5 } from "weaviate-client"
import { LocationType } from "../types/location.type"

async function storePostsToWeaviate(posts: PostType[], user: UserType) {
  if (!weaviateClient) {
    throw new Error("Weaviate client not initialized")
  }

  const weaviatePosts = weaviateClient.collections.use("Post")

  for (const post of posts) {
    const needEmbedding = await generateEmbedding(post.needSummary)
    const provideEmbedding = await generateEmbedding(post.provideSummary)
    try {
      let properties = {
        userId: user._id.toString(),
        postId: post._id.toString(),
      }

      if (post.location && post.distance) {
        // @ts-ignore
        properties.location = {
          latitude: post.location.latitude,
          longitude: post.location.longitude,
        }
        // @ts-ignore
        properties.distance = post.distance
      }
      await weaviatePosts.data.insert({
        properties,
        vectors: {
          needEmbedding,
          provideEmbedding,
        },
        id: generateUuid5(post._id.toString()),
      })
      console.log("inserted post with id", post._id.toString())
      await new Promise(resolve => setTimeout(resolve, 100)) // add delay to avoid overwhelming the server
    } catch (error) {
      console.error("Error inserting post into Weaviate with id: ", post._id.toString())
      console.log(error)
    }
  }
}

async function storeAllPostsToWeaviate() {
  const users = await User.find()
  for (const user of users) {
    await storePostsToWeaviate(user.posts as PostType[], user)
  }
}

// get closest posts for a given post of a given user
async function closestPosts(postId: string, username: string) {
  if (!weaviateClient) {
    throw new Error("Weaviate client not initialized")
  }

  const user = await User.findOne({ username })
  const post = user?.posts.id(postId)

  if (!post || !user) {
    throw new Error("Post or user not found #1")
  }

  const weaviatePosts = weaviateClient.collections.use("Post")
  const wPost = await weaviatePosts.query.fetchObjectById(generateUuid5(postId), {
    includeVector: true,
  })

  if (!wPost || !wPost.vectors) {
    throw new Error("Post or user not found #2")
  }

  const results = await getClosestPosts({
    userId: user._id.toString(),
    K: post.numMatches,
    location: wPost.properties.location as LocationType,
    distance: wPost.properties.distance as number,
    provideEmbedding: wPost.vectors.provideEmbedding as number[],
    needEmbedding: wPost.vectors.needEmbedding as number[],
  })

  return {
    searchFor: {
      postId,
      userId: user._id.toString(),
      initialPostText: post.initialPostText,
      title: post.title,
    },
    results,
  }
}

async function addPostToUser(username: string, post: PostType) {
  const user = await User.findOne({ username })
  if (!user) {
    throw new Error("User not found")
  }
  user.posts.push(post)
  await user.save()
}

async function createUser() {
  await User.create({
    username: "test-user",
    firstName: "John",
    lastName: "Wick",
    phoneNumber: "+1234567890",
    country: "Australia",
    city: "Sydney",
    state: "New South Wales",
    latitude: -33.696969,
    longitude: 151.352146,
    timezone: "America/Sydney",
    locationId: 7408,
    email: "test-user@email.com",
  })
}

async function updateAllUserPostsClosestPosts() {
  const users = await User.find()
  let count = 0
  for (const user of users) {
    for (const post of user.posts) {
      try {
        const results = await closestPosts(post._id.toString(), user.username)
        await User.updateOne(
          { username: user.username, "posts._id": post._id },
          { $set: { "posts.$.closestPosts": results.results } }
        )
        console.log("updated closest posts for post with id: ", post._id.toString())
        count++
      } catch (error) {
        console.error("Error updating closest posts for post with id: ", post._id.toString())
        console.log(error)
      }
    }
  }
  console.log("Updated closest posts for", count, "posts")
}

async function findPost(postId: string) {
  const users = await User.find()
  for (const user of users) {
    const post = user.posts.id(postId)
    if (post) {
      return { post, user }
    }
  }
  return null
}

/**
 * Compare every pair of posts using cosine similarity.
 * Track and log the minimum and maximum similarity across all pairs.
 * Print pair-by-pair similarity in server logs so you can inspect semantic closeness manually.
 * THIS USES OLD CODE, BROKEN ATM
 */
// async function getAllPostPairEvaluations() {
//   const texts = await Post.find().then((posts) => posts.map((p) => p.summary));
//   const response = await openai.embeddings.create({
//     model: "text-embedding-3-small",
//     input: texts,
//   });
//   if (!response.data || response.data.length === 0) {
//     throw new Error("No embeddings returned from AI model");
//   }
//   const embeddings = response.data.map((e) => e.embedding);
//   const posts = await Post.find();
//   const texts = posts.map((p) => p.content);
//   const embeddings = posts.map((p) => p.embedding);

//   let minSim = Infinity;
//   let maxSim = -Infinity;
//   for (let i = 0; i < texts.length; i++) {
//     for (let j = i + 1; j < texts.length; j++) {
//       const text1 = texts[i];
//       const text2 = texts[j];
//       const similarity = cosineSimilarity(
//         embeddings[i] as number[],
//         embeddings[j] as number[]
//       );
//       if (similarity < minSim) {
//         minSim = similarity;
//       }
//       if (similarity > maxSim) {
//         maxSim = similarity;
//       }
//       console.log(
//         `Text1: ${text1}\nText2: '${text2}'\nSimilarity: ${similarity.toFixed(4)}\n\n`
//       );
//     }
//   }
//   console.log("min similarity:", minSim);
//   console.log("max similarity:", maxSim);
//   res.json({ message: "Check server logs for similarity results" });
// }

// Simple route for testing

export async function test(req: Request, res: Response) {
  if (!weaviateClient) {
    throw new Error("Weaviate client not initialized")
  }

  const postId = "69b711b38a5c8924c4293d05"
  // const username = "noobmoe"
  const post = await findPost(postId)
  // const results = await closestPosts(postId, username)
  return res.json(post)
}
