import { DefaultEventsMap, Namespace, Socket } from "socket.io"
import { callForQuestion, callForSummaryAndEmbedding } from "../utils/AIQA"
import { MAX_POST_QUESTIONS } from "../utils/constants"
import { getClosestPosts } from "../utils/getClosestPosts"
import User from "../models/user.model"
import { PostType } from "../models/post.model"
import { PostSession } from "../types/session.types"

const initialSession: PostSession = {
  initialPostText: "",
  context: [],
  step: 0,
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
      if (lastPost.draft && lastPost.draft.length > 0) {
        session.context = lastPost.draft
        session.step = lastPost.draft.length
        session.initialPostText = lastPost.content || ""
        socket.emit("draft-restored", {
          context: session.context,
          initialPostText: session.initialPostText,
        })
      }
    }

    socket.on("chat", async (text: string) => {
      if (!session) return

      if (session.initialPostText === "") {
        session.initialPostText = text
        const question = await callForQuestion(session)
        if (question) {
          session.context.push({ question: question, answer: "" })
          await saveDraft(userId, session)
          socket.emit("question", question)
        }
        return
      }

      session.context[session.step].answer = text
      session.step++
      await saveDraft(userId, session)

      if (session.step < session.maxQuestions) {
        const question = await callForQuestion(session)
        if (question) {
          session.context.push({ question, answer: "" })
          await saveDraft(userId, session)
          socket.emit("question", question)
          return
        }
      }

      socket.emit("chat-finished")
    })

    socket.on(
      "submit",
      async ({
        numMatches,
        publicPost,
        images,
      }: {
        numMatches: number
        publicPost: boolean
        images: string[]
      }) => {
        const { summary, embedding } = await callForSummaryAndEmbedding(session)

        const post: Partial<PostType> = {
          content: session.initialPostText,
          images,
          publicPost,
          numMatches,
          summary,
          qna: session.context,
          embedding,
          closestPosts: null,
          draft: null, // Clear draft on submission
        }
        const closestPosts = await getClosestPosts(userId, post, numMatches)
        post.closestPosts = closestPosts

        // If there was a draft post, update it instead of creating new draft
        const user = await User.findById(userId)
        if (
          user &&
          user.posts.length > 0 &&
          user.posts[user.posts.length - 1].draft !== null &&
          user.posts[user.posts.length - 1].draft !== undefined
        ) {
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
      const user = await User.findById(userId)
      if (!user || user.posts.length === 0) return

      const lastPost = user.posts[user.posts.length - 1]
      if (!lastPost.summary || !lastPost.embedding) {
        await User.updateOne({ _id: userId }, { $pop: { posts: 1 } })
      }

      // Reset session
      session = structuredClone(initialSession)
      socket.emit("draft-discarded")
    })
  })
}

async function saveDraft(userId: string, session: PostSession) {
  const user = await User.findById(userId)
  if (!user) return

  if (user.posts.length > 0) {
    const lastPost = user.posts[user.posts.length - 1]
    if (!lastPost.summary || !lastPost.embedding) {
      await User.updateOne(
        { _id: userId, "posts._id": lastPost._id },
        {
          $set: {
            "posts.$.content": session.initialPostText,
            "posts.$.draft": session.context,
          },
        }
      )
      return
    }
  }

  // Create new draft post if no draft exists
  const draftPost: Partial<PostType> = {
    content: session.initialPostText,
    draft: session.context,
    summary: "",
    embedding: [],
    publicPost: false,
    numMatches: 5,
    qna: [],
  }

  await User.updateOne({ _id: userId }, { $push: { posts: draftPost } })
}
