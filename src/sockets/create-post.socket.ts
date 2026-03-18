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
  initialPostText: "",
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

    // Check if there's a draft and restore session
    if (user.posts.length > 0) {
      const lastPost = user.posts[user.posts.length - 1]

      if (lastPost.isDraft) {
        session.context = lastPost.qna
        session.initialPostText = lastPost.initialPostText
        socket.emit("draft-restored", session.context)
      }
    }

    socket.on("chat", async (qna: QnaType) => {
      if (!session) return

      // If answering the initial post
      if (qna.length === 1) {
        session.initialPostText = qna[0].answer[0]
      }

      session.context = qna
      // If the user is answering the very last gemini generated question
      // then this variable will be kept false and then we emit chat-finished
      if (session.context.length < session.maxQuestions) {
        const question = await callForQuestion(session)
        if (question) {
          session.context.push({ question, answer: [] })
          socket.emit("question", session.context)
        }
      } else if (session.context.length == session.maxQuestions) {
        session.context.push({
          question: {
            type: "short_answer",
            question: "Is there anything else you would like to add?",
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

    socket.on("ai-title", async () => {
      if (!session) return

      const title = await callForTitle(session)
      socket.emit("ai-title-generated", title)
    })

    socket.on(
      "submit",
      async (newPost: {
        title: string
        numMatches: number
        publicPost: boolean
        images: ImageType[] | undefined
        location: LocationType
        distance: number
      }) => {
        const { title, numMatches, publicPost, images, location, distance } = newPost

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
          publicPost,
          numMatches,
          needSummary,
          provideSummary,
          initialPostText: session.initialPostText,
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
          K: numMatches,
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

    socket.on("disconnect", async () => {
      if (session && session.context.length > 0) {
        await saveDraft(userId, session)
      }
    })

    socket.on("discard-draft", async () => {
      if (user.posts.length === 0) return

      const lastPost = user.posts[user.posts.length - 1]
      if (lastPost.isDraft) {
        await User.updateOne({ _id: userId }, { $pop: { posts: 1 } })
      }

      // Reset session
      session = structuredClone(initialSession)
      socket.emit("draft-discarded")
    })

    socket.on(
      "update-draft-settings",
      async (images: ImageType[], publicPost: boolean, numMatches: number) => {
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
                "posts.$.numMatches": numMatches,
              },
            }
          )
        }
      }
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
            "posts.$.initialPostText": session.initialPostText,
            "posts.$.qna": session.context,
          },
        }
      )
      return
    }
  }

  // Create new draft post if no draft exists
  const draftPost: Partial<PostType> = {
    initialPostText: session.initialPostText,
    qna: session.context,
    summary: "",
    publicPost: false,
    numMatches: 5,
    isDraft: true,
  }

  await User.updateOne({ _id: userId }, { $push: { posts: draftPost } })
}
