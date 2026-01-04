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
      text: `Instructions on how to answer: 
        1.  Based on the following context, generate the next relevant question to
            ask the user to specifically understand the contents of the post.
            The question should help in gathering more information to create a comprehensive post.
            You must ask ${maxQuestions} questions or less. You are currently on question ${step + 1}.
            The types of question you can ask are: short answer, multiple choice (including yes/no).
            If no further questions are needed, respond with "NO_QUESTION".

        2.  Your answer must be a JSON format containing three fields:
          - "type": What type of question you will be asking next: Pick one of the following: short_answer, multiple_choice(including yes or no).
          - "question": The next relevant question to ask the user.
          - "options": An array of options if the type is multiple_choice; otherwise, an empty array if the type is short_answer.
        
        3. If the type of question is multiple_choice, ensure that there are no options such as "Other (please specify)". All options must be definitive choices.
          
        4. Here is the context: ${JSON.stringify(context)}. And this is the initial Post Text: ${initialPostText}. `
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
