import { AIModel, getEmbedding } from "./AIModel";

export async function callForQuestion(session: {
  initialPostText: string;
  context: { question: any; answer: any }[];
  step: number;
  maxQuestions: number;
}) {
  const { initialPostText, context, step, maxQuestions } = session;
  const contents = [
    {
      type: "text",
      text: `Based on the following context, generate the next relevant question to
      ask the user to specifically understand the contents of the post.
      The question should help in gathering more information to create a comprehensive post.
      You must ask ${maxQuestions} questions or less. You are currently on question ${step + 1}.
      Do not include any other text apart from the question.
      The types of question you can ask are: short answer, multiple choice, yes/no.
      If no further questions are needed, respond with "NO_QUESTION".
      Context: ${JSON.stringify(context)} Initial Post Text: ${initialPostText}`,
    },
  ];

  const response = await AIModel(contents);
  if (response === null) {
    throw new Error("Could not generate question from AI model");
  }
  return response;
}

export async function callForEmbedding(session: {
  initialPostText: string;
  context: { question: any; answer: any }[];
  step: number;
  maxQuestions: number;
}) {
  const summary = await AIModel([
    {
      type: "text",
      text: `Based on the following context, generate a concise summary (1-2 sentences) of the post
      suitable for creating an embedding for matching purposes.
      Context: ${JSON.stringify(session.context)} Initial Post Text: ${session.initialPostText}`,
    },
  ]);
  if (!summary) {
    throw new Error("Could not generate summary for embedding");
  }

  const embedding = await getEmbedding(summary);
  return { summary, embedding };
}
