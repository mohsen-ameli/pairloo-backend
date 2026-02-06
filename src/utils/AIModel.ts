import { ai, openai } from "../server"
import { Question, questionSchema } from "../types/question.types"
import { AI_ON } from "./constants"

export async function generateQuestion(contents: string): Promise<Question | null> {
  if (!AI_ON) {
    return {
      type: "short_answer",
      question:
        "You have disabled AI mode in the backend env file. Therefore, this is a placeholder value. Enable AI mode to get actual questions.",
      options: [],
    }
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: questionSchema,
    },
  })

  if (!response || !response.text) {
    throw new Error("No response from AI model")
  }

  const question = questionSchema.parse(JSON.parse(response.text))
  return question.question === "NO_QUESTION" ? null : question
}

// Todo: Remove summary from user model and remove this function
// This function will no longer be used. I will remove it in my next pr, just to keep things prs when
// when I redesign the specific posts page.
export async function generateSummary(contents: string): Promise<string> {
  if (!AI_ON) {
    return "AI mode is disabled in the backend env file. Therefore, this is a placeholder summary. Enable AI mode to get actual summaries."
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
  })

  if (!response || !response.text) {
    throw new Error("Could not generate summary for embedding")
  }

  return response.text
}

export async function generateTitle(contents: string): Promise<string> {
  if (!AI_ON) {
    return "AI mode is disabled in the backend env file. Therefore, this is a placeholder summary. Enable AI mode to get actual summaries."
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
  })

  if (!response || !response.text) {
    throw new Error("Could not generate title for post")
  }

  return response.text
}

export async function generateEmbedding(contents: string): Promise<number[]> {
  if (!AI_ON) {
    return Array(1536).fill(1)
  }

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: contents,
  })
  if (!response.data || response.data.length === 0) {
    throw new Error("No embeddings returned from AI model")
  }
  return response.data[0].embedding
}
