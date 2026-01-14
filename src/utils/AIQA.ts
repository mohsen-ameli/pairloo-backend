import { AIModel, getEmbedding } from "./AIModel";

export async function callForQuestion(session: {
  initialPostText: string;
  context: { question: any; answer: any }[];
  step: number;
  maxQuestions: number;
}): Promise<string | undefined> {
  const { initialPostText, context, step, maxQuestions } = session;
  const contents = [
    {
      type: "text",
      text: `Instructions on how to answer:
        1.  Based on the following context, generate the next relevant question to
            ask the user to specifically understand the contents of the post.
            The question should help in gathering more information to create a comprehensive post.
            You must ask ${maxQuestions} questions or less. You are currently on question ${step + 1}.
            The types of question you can ask are: short answer, multiple choice (including yes/no), multi select (users can select multiple options).
            If no further questions are needed, respond with "NO_QUESTION".

        2.  Your answer must be a JSON format containing three fields:
          - "type": What type of question you will be asking next: Pick one of the following: short_answer, multiple_choice(including yes or no), multi_select.
          - "question": The next relevant question to ask the user.
          - "options": An array of options if the type is multiple_choice or multi_select; otherwise, an empty array if the type is short_answer.

        3. If the type of question is multiple_choice or multi_select, ensure that there are no options such as "Other (please specify)". All options must be definitive choices.

        4. Here is the context: ${JSON.stringify(context)}. And this is the initial Post Text: ${initialPostText}. `,
    },
  ];

  const response = await AIModel(contents);
  if (response === null) {
    throw new Error("Could not generate question from AI model");
  }
  return response;
}

export async function callForSummaryAndEmbedding(session: {
  initialPostText: string;
  context: { question: any; answer: any }[];
}) {
  const summary = await AIModel([
    {
      type: "text",
      text: `Based on the following context, generate a summary of the post.
      This summary will be used to create a semantic embedding for matching similar posts, so focus only on the core topics and intent.
      Context: ${JSON.stringify(session.context)} Initial Post Text: ${session.initialPostText}`,
    },
  ]);
  if (!summary) {
    throw new Error("Could not generate summary for embedding");
  }

  const embedding = await getEmbedding(summary);
  return { summary, embedding };
}

export async function callForIntention(session: {
  initialPostText: string;
  context: { question: any; answer: any }[];
}): Promise<string> {
  // For example, if the post is about looking for a running partner, the intention would be "need".
  // If the post is about selling a bike, the intention would be "provide".
  // If the post is about asking for advice on programming, the intention would be "need".
  // If the post is about someone losing their wallet, the intention would be "need".
  // If the post is about offering tutoring, the intention would be "provide".
  // If the post does not have a clear intention, respond with "general".
  const intention = await AIModel([
    {
      type: "text",
      text: `Strictly based on the following context, decide what the intention of the post is.
      You have two possible intentions to choose from: need or provide.
      Now consider a matching post scenario where users are either looking for something (need) or offering something (provide).
      What would the ideal matching post's intention be?
      Again you have only two possible intentions to choose from: need or provide.
      Your answer must be in a json format: { "my_intention": "need or provide", "matching_post_intention": "need or provide" }.
      Do not include any other formatting like bullet points or punctuation or **.
      Context: ${JSON.stringify(session.context)} Initial Post Text: ${session.initialPostText}`,
    },
  ]);
  if (!intention) {
    throw new Error("Could not generate intention for embedding");
  }

  return intention;
}
