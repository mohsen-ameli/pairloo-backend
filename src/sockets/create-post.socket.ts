import { DefaultEventsMap, Namespace, Socket } from "socket.io"
import { callForQuestion, callForSummaries, callForTitle } from "../utils/AIQA"
import { MAX_GENERATED_POST_QUESTIONS } from "../utils/constants"
import { getClosestPosts } from "../utils/getClosestPosts"
import User from "../models/user.model"
import { PostType } from "../models/post.model"
import { ImageType, PostSession, QnaType } from "../types/session.types"
import { sendObject } from "../utils/s3"
import { LocationType } from "../types/location.type"
import { weaviateClient } from "../server"
import { generateEmbedding } from "../utils/AIModel"
import { generateUuid5 } from "weaviate-client"

const initialSession: PostSession = {
  context: [],
  maxQuestions: MAX_GENERATED_POST_QUESTIONS + 1, // +1 to count the initial question
}

export function createPostSocket(
  io: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) {
  io.on("connection", async (socket: Socket) => {
    const userId = (socket as any).user.sub as string
    const user = await User.findById(userId)

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
    if (user.posts.length > 0) {
      const lastPost = user.posts[user.posts.length - 1]

      if (lastPost.isDraft) {
        session.context = lastPost.qna
        socket.emit("draft-restored", session.context)
      }
    }

    socket.on(
      "chat",
      handleSocketEvent("chat", async (qna: QnaType) => {
        if (!session) return

        // Override the context with qna object coming from frontend
        session.context = qna

        // If the user is answering the very last gemini generated question then this variable will be kept false and then we emit chat-finished
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
          socket.emit("chat-finished")
        }
        await saveDraft(userId, session)
        socket.emit("draft-saved")
      })
    )

    socket.on(
      "ai-title",
      handleSocketEvent("ai-title", async () => {
        if (!session) return

        const title = await callForTitle(session)
        socket.emit("ai-title-generated", title)
      })
    )

    socket.on(
      "submit",
      handleSocketEvent(
        "submit",
        async (newPost: {
          title: string
          description: string
          publicPost: boolean
          images: ImageType[] | undefined
          location: LocationType
          distance: number
        }) => {
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

          const { needSummary, provideSummary } = await callForSummaries(session)
          const needEmbedding = await generateEmbedding(needSummary)
          const provideEmbedding = await generateEmbedding(provideSummary)

          const post: Partial<PostType> = {
            title,
            description,
            publicPost,
            location,
            distance,
            needSummary,
            provideSummary,
            images: postImages,
            qna: session.context,
            closestPosts: null,
            isDraft: false,
          }

          // Insert to MongoDB
          const user = await User.findById(userId)
          if (user && user.posts.length > 0 && user.posts[user.posts.length - 1].isDraft) {
            await User.updateOne(
              { _id: userId, "posts._id": user.posts[user.posts.length - 1]._id },
              { $set: { "posts.$": post } }
            )
          } else {
            await User.updateOne({ _id: userId }, { $push: { posts: post } })
          }
          const updatedUser = await User.findById(userId)
          const postId = updatedUser?.posts[updatedUser.posts.length - 1]._id.toString()!

          // Insert to weaviate
          const weaviatePosts = weaviateClient.collections.use("Post")
          await weaviatePosts.data.insert({
            properties: { userId, postId, location, distance },
            vectors: { needEmbedding, provideEmbedding },
            id: generateUuid5(postId),
          })

          // Get closest posts
          const closestPosts = await getClosestPosts({
            userId,
            postId,
            location,
            distance,
            needEmbedding,
            provideEmbedding,
          })
          await User.updateOne(
            { _id: userId, "posts._id": postId },
            { $set: { "posts.$.closestPosts": closestPosts } }
          )

          socket.emit("success", postId)
          session = structuredClone(initialSession)
        }
      )
    )

    socket.on(
      "disconnect",
      handleSocketEvent("disconnect", async () => {
        if (session && session.context.length > 0) {
          await saveDraft(userId, session)
        }
      })
    )

    socket.on(
      "discard-draft",
      handleSocketEvent("discard-draft", async () => {
        if (user.posts.length === 0) return

        const lastPost = user.posts[user.posts.length - 1]
        if (lastPost.isDraft) {
          await User.updateOne({ _id: userId }, { $pop: { posts: 1 } })
        }

        // Reset session
        session = structuredClone(initialSession)
        socket.emit("draft-discarded")
      })
    )

    socket.on(
      "update-draft-settings",
      handleSocketEvent(
        "update-draft-settings",
        async (images: ImageType[], publicPost: boolean) => {
          const user = await User.findById(userId)
          if (!user || user.posts.length === 0) return

          const lastPost = user.posts[user.posts.length - 1]
          if (lastPost.isDraft) {
            await User.updateOne(
              { _id: userId, "posts._id": lastPost._id },
              {
                $set: {
                  "posts.$.images": images,
                  "posts.$.publicPost": publicPost,
                },
              }
            )
          }
        }
      )
    )
  })
}

async function saveDraft(userId: string, session: PostSession) {
  const user = await User.findById(userId)
  if (!user) return

  if (user.posts.length > 0) {
    const lastPost = user.posts[user.posts.length - 1]
    if (lastPost.isDraft) {
      await User.updateOne(
        { _id: userId, "posts._id": lastPost._id },
        {
          $set: {
            "posts.$.qna": session.context,
          },
        }
      )
      return
    }
  }

  // Create new draft post if no draft exists
  const draftPost: Partial<PostType> = {
    qna: session.context,
    publicPost: false,
    isDraft: true,
  }

  await User.updateOne({ _id: userId }, { $push: { posts: draftPost } })
}
