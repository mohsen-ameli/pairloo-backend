import { DefaultEventsMap, Namespace, Socket } from "socket.io";
import { callForQuestion, callForEmbedding } from "../utils/AIQA";
import { MAX_POST_QUESTIONS } from "../utils/constants";
import Post from "../models/post.model";
import { getClosestPosts } from "../utils/getClosestPosts";

export function createPostSocket(
  io: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) {
  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).user.sub as string;

    const session = {
      initialPostText: "",
      context: [] as { question: any; answer: any }[],
      step: 0,
      maxQuestions: MAX_POST_QUESTIONS,
    };

    socket.on("chat", async (text: string) => {
      if (!session) return;
      if (session.initialPostText === "") {
        session.initialPostText = text;
        const question = await callForQuestion(session);
        if (question) {
          session.context.push({ question: question, answer: "" });
          socket.emit("question", question);
        }
        return;
      }

      session.context[session.step].answer = text;
      session.step++;

      if (session.step < session.maxQuestions) {
        const question = await callForQuestion(session);
        if (question) {
          session.context.push({ question, answer: "" });
          socket.emit("question", question);
          return;
        }
      }

      // No more questions or reached max, get embedding
      const { summary, embedding } = await callForEmbedding(session);
      const post = new Post({
        userId,
        content: session.initialPostText,
        summary,
        qna: session.context,
        embedding,
      });
      const closestPosts = await getClosestPosts(post);
      post.set("closestPosts", closestPosts);
      await post.save();

      socket.emit("finished", post._id);
      socket.disconnect(true);
    });
  });
}
