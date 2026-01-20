/* global use, db */
/**
 * Get autocomplete suggestions for location names.
 */

use("test")

const K = 5
const userId = ""
const postId = ""

const user = db.users.findOne({
  _id: new ObjectId(userId),
})

let post

for (const p of user.posts) {
  if (p._id.equals(new ObjectId(postId))) {
    post = p
  }
}

db.users.aggregate([
  {
    $vectorSearch: {
      index: "post_embedding",
      exact: false,
      limit: K,
      numCandidates: K * 2,
      path: "posts.embedding",
      queryVector: post.embedding,
      filter: {
        _id: {
          $ne: new ObjectId(userId), // Exclude posts from the same user
        },
      },
    },
  },
  { $unwind: "$posts" },
  {
    $project: {
      _id: "$posts._id",
      userId: "$_id",
      score: { $meta: "vectorSearchScore" },
      content: "$posts.content",
      // embedding: "$posts.embedding",
    },
  },
])
