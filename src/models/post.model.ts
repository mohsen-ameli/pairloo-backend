import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  content: {
    type: String,
    required: [true, "Post content is required"],
  },
  summary: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: false,
  },
  qna: {
    type: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
  },
  closestPosts: {
    type: [
      {
        score: { type: Number, required: true },
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "post",
          required: true,
        },
      },
    ],
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Post = mongoose.model("post", postSchema);

export type PostType = mongoose.InferSchemaType<typeof postSchema>;

export default Post;
