import Post from "../models/post.model";

// Function to create the Atlas Search index for embeddings
// If we switch to a different database, this function can be called once to set up the index
// Or run it in the MongoDB shell
async function createIndex() {
  await Post.createSearchIndex({
    name: "embedding",
    definition: {
      mappings: {
        dynamic: true,
        fields: [
          {
            type: "vector",
            numDimensions: 3072,
            path: "embedding",
            similarity: "cosine",
          },
          {
            type: "filter",
            path: "userId",
          },
        ],
      },
    },
  });
}
