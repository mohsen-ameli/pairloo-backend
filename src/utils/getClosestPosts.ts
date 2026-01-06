import Post, { PostType } from "../models/post.model";

export async function getClosestPosts(post: Partial<PostType>, K = 5) {
  if (!post.embedding) {
    throw new Error("Post must have an embedding");
  }

  const results = await Post.aggregate([
    {
      $vectorSearch: {
        index: "embedding_index",
        exact: false,
        limit: K,
        numCandidates: K * 2,
        path: "embedding",
        queryVector: post.embedding,
        filter: {
          userId: { $ne: (post as any).userId }, // Exclude posts from the same user
        },
      },
    },
    {
      $project: {
        _id: 1,
        score: { $meta: "vectorSearchScore" },
        content: 1,
      },
    },
  ]);

  return results.map((doc: any) => ({
    item: doc._id,
    score: doc.score,
  }));
}
