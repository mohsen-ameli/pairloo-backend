import { DefaultEventsMap, Namespace, Socket } from "socket.io";
import { callForQuestion, callForSummaryAndEmbedding } from "../utils/AIQA";
import { MAX_POST_QUESTIONS } from "../utils/constants";
import { getClosestPosts } from "../utils/getClosestPosts";
import User from "../models/user.model";
import { PostType } from "../models/post.model";
import { PostSession } from "../types/session.types";

const initialSession: PostSession = {
  initialPostText: "",
  context: [],
  step: 0,
  maxQuestions: MAX_POST_QUESTIONS,
};

export function createPostSocket(
  io: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
) {
  io.on("connection", async (socket: Socket) => {
    const userId = (socket as any).user.sub as string
    const user = await User.findById(userId)

    if (!user) {
      socket.emit("error", "User not found")
      socket.disconnect(true)
      return
    }

    let session = structuredClone(initialSession);

    socket.on("chat", async (text: string) => {
      if (!session) return

      if (session.initialPostText === "") {
        session.initialPostText = text
        const question = await callForQuestion(session)
        if (question) {
          session.context.push({ question: question, answer: "" })
          socket.emit("question", question)
        }
        return
      }

      session.context[session.step].answer = text
      session.step++

      if (session.step < session.maxQuestions) {
        const question = await callForQuestion(session)
        if (question) {
          session.context.push({ question, answer: "" })
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
        }
        const closestPosts = await getClosestPosts(userId, post, numMatches)
        post.closestPosts = closestPosts
        await User.updateOne({ _id: userId }, { $push: { posts: post } })
        const postId = (await User.findById(userId))!.posts.slice(-1)[0]._id

        socket.emit("success", postId);
        session = structuredClone(initialSession);
      },
    );
  });
}
