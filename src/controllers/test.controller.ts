import { getClosestPosts } from "../utils/getClosestPosts";
import { callForSummaryAndEmbedding, callForIntention } from "../utils/AIQA";
import { cosineSimilarity } from "../utils/embedding";
import mongoose from "mongoose";
import { Request, Response } from "express";
import User from "../models/user.model";

// Simple route for testing
export async function test(req: Request, res: Response) {
  res.json({ message: "Test route is working!" });

  // const postId = req.query.postId as string;
  // const userId = req.query.userId as string;

  // const user = await User.findById(userId);
  // if (!user) {
  //   return res.status(404).json({ message: "Sample post not found" });
  // }
  // const samplePost = user.posts.id(postId);
  // if (!samplePost) {
  //   return res.status(404).json({ message: "Sample post not found" });
  // }

  // const allPosts = await User.aggregate([{ $unwind: "$posts" }]);
  // console.log(allPosts.length);

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
