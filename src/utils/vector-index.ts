import User from "../models/user.model"

// Function to create the Atlas Search index for embeddings
// If we switch to a different database, this function can be called once to set up the index
// Or run it in the MongoDB shell
async function createIndex() {
  await User.createSearchIndex({
    name: "embedding",
    definition: {
      mappings: {
        dynamic: true,
        fields: [
          {
            numDimensions: 1536,
            path: "posts.embedding",
            similarity: "cosine",
            type: "vector",
          },
          {
            path: "_id",
            type: "filter",
          },
        ],
      },
    },
  })
}
