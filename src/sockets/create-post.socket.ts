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
      if (lastPost.isDraft && lastPost.qna && lastPost.qna.length > 0) {
        session.context = lastPost.qna
        // Set step to the first unanswered question, or to length if all are answered
        session.step = session.context.findIndex(item => item.answer.trim() === "")
        if (session.step === -1) {
          session.step = session.context.length
        }
        session.initialPostText = lastPost.content || ""
        socket.emit("draft-restored", {
          context: session.context,
          initialPostText: session.initialPostText,
          images: lastPost.images || [],
          publicPost: lastPost.publicPost || false,
          numMatches: lastPost.numMatches || 5,
        })
      }
    }

    socket.on("chat", async (text: string) => {
      if (!session) return

      // Type guard for chat payload
      function isAnswerPayload(obj: any): obj is { value: string; questionIdx: number } {
        return (
          typeof obj === "object" &&
          obj !== null &&
          typeof obj.value === "string" &&
          typeof obj.questionIdx === "number"
        )
      }

      if (isAnswerPayload(text)) {
        // If answering the initial post
        if (text.questionIdx === 0 && session.initialPostText === "") {
          session.initialPostText = text.value
          const question = await callForQuestion(session)
          if (question) {
            session.context.push({ question: question, answer: "" })
            await saveDraft(userId, session)
            socket.emit("question", question)
          }
          return
        }

        if (text.questionIdx > 0 && text.questionIdx - 1 < session.context.length) {
          session.context[text.questionIdx - 1].answer = text.value
          await saveDraft(userId, session)
          if (text.questionIdx - 1 === session.step) {
            session.step++
          }
        }

        if (session.step < session.maxQuestions && session.step === session.context.length) {
          const question = await callForQuestion(session)
          if (question) {
            session.context.push({ question, answer: "" })
            await saveDraft(userId, session)
            socket.emit("question", question)
            return
          }
        }
        socket.emit("chat-finished")
        return
      }

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

      if (session.step < session.context.length) {
        session.context[session.step].answer = text
        await saveDraft(userId, session)
        session.step++
      }

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
      const user = await User.findById(userId)
      if (!user || user.posts.length === 0) return

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
      async ({
        images,
        publicPost,
        numMatches,
      }: {
        images: string[]
        publicPost: boolean
        numMatches: number
      }) => {
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
