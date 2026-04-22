import { getClosestPosts } from "../utils/getClosestPosts"
import { Request, Response } from "express"
import User, { UserType } from "../models/user.model"
import { weaviateClient } from "../server"
import { generateEmbedding } from "../utils/AIModel"
import { PostType } from "../models/post.model"
import { generateUuid5 } from "weaviate-client"
import { LocationType } from "../types/location.type"
import { sendPushNotification } from "../utils/send-push-notification"

async function storePostsToWeaviate(posts: PostType[], user: UserType) {
  if (!weaviateClient) {
    throw new Error("Weaviate client not initialized")
  }

  const weaviatePosts = weaviateClient.collections.use("Post")

  for (const post of posts) {
    try {
      const existing = await weaviatePosts.data.exists(generateUuid5(post._id.toString()))
      if (existing) {
        console.log("post with id", post._id.toString(), "already exists in Weaviate, skipping")
        continue
      }

      const needEmbedding = await generateEmbedding(post.needSummary)
      const provideEmbedding = await generateEmbedding(post.provideSummary)
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
      console.error("Error processing post with id: ", post._id.toString())
      console.log(error)
      continue
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
async function closestPosts(postId: string, userId: string) {
  if (!weaviateClient) {
    throw new Error("Weaviate client not initialized")
  }

  const user = await User.findById(userId)
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
    userId,
    postId,
    location: wPost.properties.location as LocationType,
    distance: wPost.properties.distance as number,
    provideEmbedding: wPost.vectors.provideEmbedding as number[],
    needEmbedding: wPost.vectors.needEmbedding as number[],
  })

  return {
    searchFor: {
      postId,
      userId: user._id.toString(),
      title: post.title,
    },
    results,
  }
}

async function addPostToUser(userId: string, post: Partial<PostType>) {
  const user = await User.findById(userId)
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

async function deleteAllUserClosestPosts() {
  const users = await User.find()
  for (const user of users) {
    for (const post of user.posts) {
      await User.updateOne(
        { _id: user._id, "posts._id": post._id },
        { $set: { "posts.$.closestPosts": [] } }
      )
    }
  }
}

async function updateAllUserPostsClosestPosts() {
  const users = await User.find()
  let count = 0
  for (const user of users) {
    for (const post of user.posts) {
      try {
        const results = await closestPosts(post._id.toString(), user._id.toString())
        await User.updateOne(
          { _id: user._id, "posts._id": post._id },
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

  // const postId = "69b711b38a5c8924c4293d05"
  // // const username = "noobmoe"
  // const post = await findPost(postId)
  // // const results = await closestPosts(postId, username)
  // return res.json(post)

  const myId = "6953259c89bfe6ca51b7e1d6" //req.user!.sub
  const user = await User.findById(myId)

  if (!user || !user.expoPushToken) {
    return res.status(404).json({ error: "User not found" })
  }

  // await sendPushNotification(
  //   user.expoPushToken,
  //   "Test Notification",
  //   "This is a test push notification from the server!"
  // )

  const postId = req.query.postId as string
  const userId = req.query.userId as string
  // const post = await findPost(postId)

  // @ts-ignore
  // storePostsToWeaviate([post?.post], post?.user)

  // await deleteAllUserClosestPosts()
  // await updateAllUserPostsClosestPosts()
  // return res.json({ message: "Post stored to Weaviate, check server logs for details" })

  const closePosts = await closestPosts(postId, userId)
  return res.json(closePosts)
}

/**
 * Example of adding a post
 */
// await addPostToUser(userId, {
//   title: "Selling a hybrid bike in LA",
//   description:
//     "Looking to sell my hybrid bike that's perfect for commuting and recreational riding on paved paths. I'm based in Los Angeles and would prefer local buyers. The bike is in great condition and has been well-maintained. If you're interested or have any questions, feel free to reach out!",
//   needSummary: "",
//   provideSummary:
//     "Selling a hybrid bike for commuting and recreational riding on paved paths with a budget between 400 and 600 dollars requiring a medium or 17 to 18 inch frame for a height of 5 feet 9 inches and preferring at least 7 speeds a comfortable seat and the ability to attach a rack",
//   location: {
//     longitude: -118.350985,
//     latitude: 33.925983,
//   },
//   images: [],
//   publicPost: false,
//   qna: [
//     {
//       question: {
//         intention: "need",
//         type: "short_answer",
//         question: "Start by describing what you want to post about.",
//         options: [],
//       },
//       answer: ["I wanna sell a bike"],
//     },
//     {
//       question: {
//         intention: "provide",
//         type: "multiple_choice",
//         question: "What type of bike are you looking for?",
//         options: [
//           "Road bike",
//           "Mountain bike",
//           "Hybrid bike",
//           "Electric bike",
//           "BMX bike",
//           "City bike",
//           "Folding bike",
//           "Cruiser bike",
//           "Gravel bike",
//           "Fixed-gear bike",
//         ],
//       },
//       answer: ["Hybrid bike"],
//     },
//     {
//       question: {
//         intention: "provide",
//         type: "multi_select",
//         question: "What will be the primary use(s) for your new hybrid bike?",
//         options: [
//           "Commuting",
//           "Recreational riding on paved paths",
//           "Light off-road trails",
//           "Fitness/Exercise",
//           "Errands/Casual rides",
//         ],
//       },
//       answer: ["Commuting", "Recreational riding on paved paths"],
//     },
//     {
//       question: {
//         intention: "need",
//         type: "short_answer",
//         question: "What is your budget for the bike?",
//         options: [],
//       },
//       answer: ["Around $400 to $600, but flexible for the right bike"],
//     },
//     {
//       question: {
//         intention: "provide",
//         type: "short_answer",
//         question: "What frame size is the bike you are selling?",
//         options: [],
//       },
//       answer: ["I'm 5'9\" tall, so I think I need a medium or 17-18 inch frame"],
//     },
//     {
//       question: {
//         intention: "provide",
//         type: "short_answer",
//         question:
//           "Do you have any preferences for specific features (e.g., gears, brakes, accessories included)?",
//         options: [],
//       },
//       answer: [
//         "Would like at least 7 speeds, comfortable seat, and a rack or ability to add one for commuting",
//       ],
//     },
//   ],
//   isDraft: false,
//   closestPosts: [],
// })
