import Post, { PostType } from "../models/post.model";

export async function getClosestPosts(newPost: Partial<PostType>, K = 5) {
  if (!newPost.embedding) {
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
        queryVector: newPost.embedding,
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
      },
    },
  ]);

  // Add newPost to each of its closestPosts's closestPosts array
  for (const doc of results) {
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

  return results.map((doc: any) => ({
    item: doc._id,
    score: doc.score,
  }));
}
