import { getClosestPosts } from "../utils/getClosestPosts"
import { callForSummaries, callForQuestion, callForEmbeddings } from "../utils/AIQA"
import { cosineSimilarity } from "../utils/embedding"
import mongoose from "mongoose"
import { Request, Response } from "express"
// import User from "../models/user.model"
import { createAvatar } from "@dicebear/core"
import { adventurer, lorelei, thumbs } from "@dicebear/collection"
import { PostSession } from "../types/session.types"
import { ObjectId } from "mongodb"
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
      await weaviatePosts.data.insert({
        properties: {
          userId: user._id.toString(),
          postId: post._id.toString(),
          location: {
            latitude: post.location.latitude,
            longitude: post.location.longitude,
          },
          distance: post.distance,
        },
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

async function getClosestPostsTesting(postId: string, username: string) {
  if (!weaviateClient) {
    throw new Error("Weaviate client not initialized")
  }

  const user = await User.findOne({ username })
  const post = user?.posts.id(postId)

  if (!post || !user) {
    throw new Error("Post or user not found")
  }

  const weaviatePosts = weaviateClient.collections.use("Post")
  const wPost = await weaviatePosts.query.fetchObjectById(generateUuid5(postId), {
    includeVector: true,
  })

  if (!wPost || !wPost.vectors) {
    throw new Error("Post or user not found")
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
  for (const user of users) {
    for (const post of user.posts) {
      const results = await getClosestPostsTesting(post._id.toString(), user.username)
      await User.updateOne(
        { username: user.username, "posts._id": post._id },
        { $set: { "posts.$.closestPosts": results.results } }
      )
    }
  }
}

// Simple route for testing
export async function test(req: Request, res: Response) {
  if (!weaviateClient) {
    throw new Error("Weaviate client not initialized")
  }

  // const postId = "69b5e14bae667dfd9ddb809a"
  // const username = "noobmoe"
  // const results = await getClosestPostsTesting(postId, username)
  // return res.json(results)

  // await updateAllUserPostsClosestPosts()

  return res.json({ message: "Test route is working!" })

  /**
   * Generate embedding for 100 posts and update their embeddings
   * Context driven
   */
  // // Get all other posts' summaries as context
  // const posts = await Post.find().limit(100);
  // const postsSummaries = posts.map((p) => p.summary);

  // // Use OpenAI to generate the embedding for the sample post with context
  // const response = await openai.embeddings.create({
  //   model: "text-embedding-3-small",
  //   input: postsSummaries,
  // });

  // if (!response.data || response.data.length === 0) {
  //   return res
  //     .status(500)
  //     .json({ message: "No embedding returned from OpenAI" });
  // }

  // // update every post's embedding
  // for (let i = 0; i < posts.length; i++) {
  //   const post = posts[i];
  //   const embedding = response.data[i].embedding;
  //   await Post.updateOne({ _id: post._id }, { $set: { embedding } });
  // }

  /**
   * Get closest posts for the sample post
   */
  // const results = await getClosestPosts(userId, samplePost, 5);
  // return res.json(results);

  /**
   * Update embedding and summary for the sample post
   */
  // const { summary, embedding } = await callForSummaryAndEmbedding({
  //   initialPostText: samplePost.content,
  //   context: samplePost.qna,
  // });
  // await Post.updateOne(
  //   { _id: samplePost._id },
  //   { $set: { summary, embedding } }
  // );

  /**
   * Generate intention for one post
   */
  // const intention = await callForIntention({
  //   initialPostText: samplePost.content,
  //   context: samplePost.qna,
  // });
  // res.json({
  //   postId: samplePost._id,
  //   summary: samplePost.content,
  //   intention: intention,
  // });

  /**
   * Generate intentions for all posts in the database
   */
  // const results = [];
  // const posts = await Post.find();
  // for (const post of posts) {
  //   const { summary, embedding } = await callForIntention({
  //     initialPostText: post.content,
  //     context: post.qna,
  //   });
  //   results.push({
  //     postId: post._id,
  //     summary: post.content,
  //     intention: summary,
  //   });
  // }
  // res.json(results);

  /**
   * Generate embedding for all posts in the database
   */
  // const results = [];
  // const posts = await Post.find();
  // for (let i = 17; i < posts.length; i++) {
  //   const post = posts[i];
  //   const { summary, embedding } = await callForSummaryAndEmbedding({
  //     initialPostText: post.content,
  //     context: post.qna,
  //   });
  //   await Post.updateOne({ _id: post._id }, { $set: { summary, embedding } });
  //   results.push({
  //     postId: post._id,
  //     summary,
  //   });
  //   console.log("updated #", i + 1, "of", posts.length);
  // }
  // res.json(results);

  /**
   * get closest posts for all posts in the database
   */
  // const posts = await Post.find();
  // for (let i = 0; i < posts.length; i++) {
  //   const post = posts[i];
  //   const closestPosts = await getClosestPosts(post, 5);
  //   await Post.updateOne(
  //     { _id: post._id },
  //     { $set: { closestPosts: closestPosts } }
  //   );
  //   console.log("updated closestPosts #", i + 1, "of", posts.length);
  // }
  // res.json({ message: "Updated closestPosts for all posts" });

  /**
   * Testing something out
   */
  // const response = await ai.models.embedContent({
  //   model: "gemini-embedding-001",
  //   contents: texts,
  //   config: {
  //     taskType: "CLASSIFICATION",
  //   },
  // });
  // const texts = await Post.find().then((posts) => posts.map((p) => p.summary));
  // const response = await openai.embeddings.create({
  //   model: "text-embedding-3-small",
  //   input: texts,
  // });
  // if (!response.data || response.data.length === 0) {
  //   throw new Error("No embeddings returned from AI model");
  // }
  // const embeddings = response.data.map((e) => e.embedding);
  // const posts = await Post.find();
  // const texts = posts.map((p) => p.content);
  // const embeddings = posts.map((p) => p.embedding);

  // let minSim = Infinity;
  // let maxSim = -Infinity;
  // for (let i = 0; i < texts.length; i++) {
  //   for (let j = i + 1; j < texts.length; j++) {
  //     const text1 = texts[i];
  //     const text2 = texts[j];
  //     const similarity = cosineSimilarity(
  //       embeddings[i] as number[],
  //       embeddings[j] as number[]
  //     );
  //     if (similarity < minSim) {
  //       minSim = similarity;
  //     }
  //     if (similarity > maxSim) {
  //       maxSim = similarity;
  //     }
  //     console.log(
  //       `Text1: ${text1}\nText2: '${text2}'\nSimilarity: ${similarity.toFixed(4)}\n\n`
  //     );
  //   }
  // }
  // console.log("min similarity:", minSim);
  // console.log("max similarity:", maxSim);
  // res.json({ message: "Check server logs for similarity results" });

  // const texts = await Post.find().then((posts) => posts.map((p) => p.summary));
  // const response = await openai.embeddings.create({
  //   model: "text-embedding-3-small",
  //   input: texts,
  // });
  // const embedding = response.data[0].embedding;
  // res.json({ message: "Check server logs for embedding results" });

  // console.log(embedding);
}

// app.get("/pop-mongo", async (req: Request, res: Response) => {
//   console.log("Populating MongoDB from CSV...");
//   const start = Date.now();
//   await csvToMongo();
//   const end = Date.now();
//   res.json({
//     message: "MongoDB populated from CSV.",
//     timeTakenSeconds: (end - start) / 1000,
//   });
// });
