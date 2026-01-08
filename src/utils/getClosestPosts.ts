import Post, { PostType } from "../models/post.model";
import { cosineSimilarity } from "./embedding";

export async function getClosestPosts(newPost: Partial<PostType>, K = 5) {
  // Step 1: Use vectorSearch to get top K candidates
  const closePosts: {
    _id: string;
    score: number;
    content: string;
    embedding?: number[];
  }[] = await Post.aggregate([
    {
      $vectorSearch: {
        index: "embedding_index",
        exact: false,
        limit: K,
        numCandidates: K * 2,
        path: "embedding",
        queryVector: newPost.embedding!,
        filter: {
          userId: { $ne: (newPost as any).userId }, // Exclude posts from the same user
        },
      },
    },
    {
      $project: {
        _id: 1,
        score: { $meta: "vectorSearchScore" },
        content: 1,
        embedding: 1,
      },
    },
  ]);

  // Step 2: For each result, calculate true cosine similarity
  const results = closePosts.map((doc) => {
    const score = cosineSimilarity(newPost.embedding!, doc.embedding!);
    return {
      item: doc._id,
      atlasScore: doc.score,
      score,
      content: doc.content,
    };
  });

  // Add newPost to each of its closestPosts's closestPosts array
  for (const doc of closePosts) {
    const id = doc._id.toString();
    // if newPost isn't already in closestPosts's array of each of newPosts's closestPosts, add it
    const closePost = await Post.findById(id);
    const alreadyExists = (closePost?.closestPosts || []).some(
      (cp) => cp.item.toString() === (newPost as any)._id.toString()
    );
    if (alreadyExists) continue;

    await Post.updateOne(
      { _id: id },
      {
        $push: {
          closestPosts: {
            item: (newPost as any)._id,
            score: doc.score,
          },
        },
      }
    );
  }

  return results;
}
