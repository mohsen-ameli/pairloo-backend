import { cosineSimilarity } from "./embedding";
import mongoose from "mongoose";
import Post, { PostType } from "../models/post.model";

// IMPROVEMENTS NEEDED: Use atlas search to find closest posts based on embedding
export async function getClosestPosts(post: Partial<PostType>, K = 5) {
  if (!post.embedding) {
    throw new Error("Post must have an embedding");
  }

  const results: {
    score: number;
    item: mongoose.Types.ObjectId;
  }[] = [];

  const posts = await Post.find({
    userId: { $ne: post.userId },
  });

  for (const postInDB of posts) {
    const score = cosineSimilarity(post.embedding, postInDB.embedding);
    results.push({ score, item: postInDB._id });
  }

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, K);
}
