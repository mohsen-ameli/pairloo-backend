import { Summaries } from "../types/question.types"
import { PostSession } from "../types/session.types"
import { generateText, generateQuestion, generateSummaries, generateEmbedding } from "./AIModel"
import { EMBEDDING_DIMENSION } from "./constants"

export async function callForQuestion(session: PostSession) {
  const { initialPostText, context, maxQuestions } = session
  const step = context.length
  const prompt = `Instructions on how to answer:
        1.  Based on the following context, generate the next relevant question to
            ask the user to specifically understand the contents of the post.
            The question should help in gathering more information to create a comprehensive post.
            Ask the most important questions first.

        2.  Every post is consisted of need and provide parts.
            The need part indicates what the user is looking for,
            while the provide part indicates what the user is offering.
            Out of the maximum number of questions allowed, which is ${maxQuestions}
            you should allocate however many questions you deem necessary to fully understand both the need and provide parts of the post.
            You must ensure that both parts are adequately covered by your questions.
            You are currently on question ${step}.
            You must not exceed the maximum number of questions.
            You may stop asking questions before reaching the maximum if you believe no further questions are necessary.

        3.  Your answer must be a JSON format containing three fields:
          - "intention": The intention of the question, either "need" or "provide".
          - "type": What type of question you will be asking next: Pick one of the following: short_answer, multiple_choice(including yes or no), multi_select.
          - "question": The next relevant question to ask the user.
          - "options": An array of options if the type is multiple_choice or multi_select; otherwise, an empty array if the type is short_answer.
          - If no further questions are needed, respond with "NO_QUESTION".

        4. If the type of question is multiple_choice or multi_select, ensure that there are no options such as "Other (please specify)". All options must be definitive choices.

        5. Here is the context: ${JSON.stringify(context)}. And this is the initial Post Text: ${initialPostText}. `

  const response = await generateQuestion(prompt)
  return response
}

export async function callForTitle(session: PostSession): Promise<string> {
  const { initialPostText, context } = session
  const prompt = `Based on the following post information, generate a concise and engaging title (5-10 words
      maximum) that captures the essence of the post.
      Do not include any quotation marks or special formatting. Do not include phrases like "The user is looking for..." or "The post is about...".
      Examples of good titles: "Looking for a Running Partner in NYC", "Offering Guitar Lessons for Beginners", "Seeking Advice on Home Gardening".
      Examples of bad titles: "User needs help", "Post about selling bike", "Looking for something".
      Context: ${JSON.stringify(context)} Initial Post Text: ${initialPostText}`

  const title = await generateText(prompt)
  return title
}

export async function callForSummaries(session: {
  initialPostText: string
  context: { question: any; answer: any }[]
}) {
  const prompt = `
  Strictly based on the following context and initial post text,
  generate two summaries, one for the need part and one for the provide part of the post.
  These summaries will then be used to generate embeddings for matching similar posts.
  If the post does not have a need or provide part, generate an empty summary for that part.
  Your answer must be in a JSON format: { "needSummary": "summary of the need part", "provideSummary": "summary of the provide part" }.
  Do not include any other formatting like bullet points or punctuation or **.
  Context: ${JSON.stringify(session.context)} Initial Post Text: ${session.initialPostText}`

  const summaries = await generateSummaries(prompt)
  if (!summaries) {
    throw new Error("Could not generate summaries")
  }

  return summaries
}

export async function callForEmbeddings(summaries: Summaries) {
  let needEmbedding
  let provideEmbedding
  if (summaries.needSummary === "") {
    needEmbedding = Array(EMBEDDING_DIMENSION).fill(0)
  } else {
    needEmbedding = await generateEmbedding(summaries.needSummary)
  }
  if (summaries.provideSummary === "") {
    provideEmbedding = Array(EMBEDDING_DIMENSION).fill(0)
  } else {
    provideEmbedding = await generateEmbedding(summaries.provideSummary)
  }
  return { needEmbedding, provideEmbedding }
}
