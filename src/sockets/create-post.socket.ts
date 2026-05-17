import { callForQuestion, callForSummaries, callForTitle } from "../utils/AIQA"
import { MAX_GENERATED_POST_QUESTIONS } from "../utils/constants"
import { getClosestPosts } from "../utils/getClosestPosts"
import User from "../models/user.model"
import Post, { PostType } from "../models/post.model"
import { PostSession } from "../types/session.types"
import { sendObject } from "../utils/s3"
import { weaviateClient } from "../server"
import { generateEmbedding } from "../utils/AIModel"
import { generateUuid5 } from "weaviate-client"
import mongoose from "mongoose"
import { CreatePostSocket } from "../types/socket/create-post-socket.types"

const initialSession: PostSession = {
  context: [],
  maxQuestions: MAX_GENERATED_POST_QUESTIONS + 1, // +1 to count the initial question
}

export function createPostSocket(io: CreatePostSocket) {
  io.on("connection", async socket => {
    const userId = (socket as any).user.sub as string
    const user = await User.findById(userId)
    const posts = await Post.find({ userId }).sort({ createdAt: 1 })
    let draftId = ""

    if (!user) {
      socket.emit("error", "User not found")
      socket.disconnect(true)
      return
    }

    let session = structuredClone(initialSession)

    const handleSocketEvent = <T extends any[]>(
      eventName: string,
      handler: (...args: T) => Promise<void>
    ) => {
      return async (...args: T) => {
        try {
          await handler(...args)
        } catch (error) {
          console.error(`[create-post:${eventName}]`, error)
          socket.emit("error", "Something went wrong. Please try again.")
        }
      }
    }

    // Check if there's a draft and restore session
    if (posts.length > 0) {
      const lastPost = posts[posts.length - 1]

      if (lastPost.status === "draft") {
        draftId = lastPost._id.toString()
        session.context = lastPost.qna
        socket.emit("draftRestored", session.context)
      }
    }

    socket.on(
      "chat",
      handleSocketEvent("chat", async qna => {
        if (!session) return

        // Override the context with qna object coming from frontend
        session.context = qna

        // If the user is answering the very last gemini generated question then this variable will be kept false and then we emit chatFinished
        if (session.context.length < session.maxQuestions) {
          const question = await callForQuestion(session)
          if (question) {
            session.context.push({ question, answer: [] })
            socket.emit("question", session.context)
          }
        } else if (session.context.length == session.maxQuestions) {
          // Last question
          session.context.push({
            question: {
              type: "short_answer",
              question: "Is there anything else you would like to add?",
              optional: true,
            },
            answer: [],
          })
          socket.emit("question", session.context)
        } else {
          socket.emit("chatFinished")
        }
        draftId = await saveDraft(draftId, userId, session)
        socket.emit("draftSaved")
      })
    )

    socket.on(
      "aiTitle",
      handleSocketEvent("aiTitle", async () => {
        if (!session) return

        const title = await callForTitle(session)
        socket.emit("aiTitleGenerated", title)
      })
    )

    socket.on(
      "submit",
      handleSocketEvent("submit", async newPost => {
        const { title, description, publicPost, images, location, distance } = newPost

        if (!weaviateClient) {
          socket.emit("error", "Weaviate client not initialized")
          socket.disconnect(true)
          return
        }

        const postImages: string[] = []
        for (const img of images || []) {
          const { file, mimeType } = img
          let fileName: string | null = ""
          if (file && mimeType) {
            fileName = await sendObject("posts", file, mimeType)
            if (!fileName) {
              socket.emit("error", "Failed to upload attachment")
              return
            }
            postImages.push(fileName)
          }
        }

        const { needSummary, provideSummary, generalSummary } = await callForSummaries(session)
        const needEmbedding = await generateEmbedding(needSummary)
        const provideEmbedding = await generateEmbedding(provideSummary)
        const generalEmbedding = await generateEmbedding(generalSummary)

        const post: Partial<PostType> = {
          userId: new mongoose.Types.ObjectId(userId),
          title,
          description,
          publicPost,
          location,
          distance,
          needSummary,
          provideSummary,
          generalSummary,
          images: postImages,
          qna: session.context,
          closestPosts: [],
          status: "active",
        }

        // Insert to MongoDB
        const user = await User.findById(userId)
        const posts = await Post.find({ userId })
        let postId = ""
        if (user && posts.length > 0 && posts[posts.length - 1].status === "draft") {
          await Post.findByIdAndUpdate(posts[posts.length - 1]._id, post, { new: true })
          postId = posts[posts.length - 1]._id.toString()
        } else {
          const newPost = await Post.create(post)
          postId = newPost._id.toString()
        }

        // Insert to weaviate
        const weaviatePosts = weaviateClient.collections.use("Post")
        await weaviatePosts.data.insert({
          properties: { userId, postId, location, distance },
          vectors: { needEmbedding, provideEmbedding, generalEmbedding },
          id: generateUuid5(postId),
        })

        // Get closest posts
        const closestPosts = await getClosestPosts({
          userId: new mongoose.Types.ObjectId(userId),
          postId: new mongoose.Types.ObjectId(postId),
          location,
          distance,
          needEmbedding,
          provideEmbedding,
        })
        await Post.findByIdAndUpdate(postId, { closestPosts })

        socket.emit("success", postId)
        session = structuredClone(initialSession)
      })
    )

    socket.on(
      "disconnect",
      handleSocketEvent("disconnect", async () => {
        if (session && session.context.length > 0) {
          draftId = await saveDraft(draftId, userId, session)
        }
      })
    )

    socket.on(
      "discardDraft",
      handleSocketEvent("discardDraft", async () => {
        if (!draftId) {
          socket.emit("draftDiscarded")
          return
        }

        await Post.findByIdAndDelete(draftId)
        session = structuredClone(initialSession)
        socket.emit("draftDiscarded")
      })
    )

    socket.on(
      "updateDraftSettings",
      handleSocketEvent("updateDraftSettings", async (title, description, images, publicPost) => {
        await Post.findByIdAndUpdate(draftId, { title, description, images, publicPost })
      })
    )
  })
}

async function saveDraft(draftId: string, userId: string, session: PostSession) {
  // No draft exists, so create one and send back the new id to be saved
  if (!draftId) {
    const draft = await Post.create({
      userId,
      title: "Draft",
      description: "Draft description",
      qna: session.context,
      publicPost: false,
      status: "draft",
    })
    return draft._id.toString()
  }

  // Update existing draft
  await Post.findByIdAndUpdate(draftId, { qna: session.context })

  return draftId
}
