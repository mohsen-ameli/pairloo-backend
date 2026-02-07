import { DefaultEventsMap, Namespace, Socket } from "socket.io"
import { callForQuestion, callForSummaryAndEmbedding, callForTitle } from "../utils/AIQA"
import { MAX_POST_QUESTIONS } from "../utils/constants"
import { getClosestPosts } from "../utils/getClosestPosts"
import User from "../models/user.model"
import { PostType } from "../models/post.model"
import { ImageType, PostSession, QnaType } from "../types/session.types"
import { sendObject } from "../utils/s3"

const initialSession: PostSession = {
  initialPostText: "",
  context: [],
  maxQuestions: MAX_POST_QUESTIONS,
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
        session.initialPostText = lastPost.content
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
      async (title: string, numMatches: number, publicPost: boolean, images: ImageType[]) => {
        const { summary, embedding } = await callForSummaryAndEmbedding(session)
        const postImages: string[] = []

        for (const img of images) {
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

        const post: Partial<PostType> = {
          title,
          content: session.initialPostText,
          // @ts-ignore
          images: postImages,
          publicPost,
          numMatches,
          summary,
          qna: session.context,
          embedding,
          closestPosts: null,
          isDraft: false,
        }
        const closestPosts = await getClosestPosts(userId, post, numMatches)
        post.closestPosts = closestPosts

        // Change the existing draft value to false
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
        const postId = updatedUser!.posts.slice(-1)[0]._id

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
            "posts.$.content": session.initialPostText,
            "posts.$.qna": session.context,
          },
        }
      )
      return
    }
  }

  // Create new draft post if no draft exists
  const draftPost: Partial<PostType> = {
    content: session.initialPostText,
    qna: session.context,
    summary: "",
    embedding: [],
    publicPost: false,
    numMatches: 5,
    isDraft: true,
  }

  await User.updateOne({ _id: userId }, { $push: { posts: draftPost } })
}
