import { ai } from "../server"
import { summariesSchema, Question, questionSchema } from "../types/question.types"
import { AI_ON, EMBEDDING_DIMENSION } from "./constants"

const MODEL = "gemini-3.1-flash-lite-preview"
const AI_OFF_MESSAGE =
  "AI mode is disabled in the backend env file. Therefore, this is a placeholder value. Enable AI mode to get actual results."

export async function generateQuestion(contents: string): Promise<Question | null> {
  if (!AI_ON) {
    return {
      intention: "need",
      type: "short_answer",
      question: AI_OFF_MESSAGE,
      options: [],
    }
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
  })

  if (!response || !response.text) {
    throw new Error("No response from AI model")
  }

  if (response.text.trim() === "NO_QUESTION") {
    return null
  }

  const question = questionSchema.parse(JSON.parse(response.text))
  return question
}

export async function generateText(contents: string): Promise<string> {
  if (!AI_ON) {
    return AI_OFF_MESSAGE
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
  })

  if (!response || !response.text) {
    throw new Error("Could not generate summary for embedding")
  }

  return response.text
}

export async function generateEmbedding(contents: string): Promise<number[]> {
  if (!AI_ON || contents.trim() === "") {
    return Array(EMBEDDING_DIMENSION).fill(0)
  }

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents,
  })

  if (!response || !response.embeddings) {
    throw new Error("Could not generate embedding")
  }

  const values = response.embeddings[0]?.values
  if (!values) {
    throw new Error("Embedding values are missing")
  }

  return values
}

export async function generateSummaries(contents: string) {
  if (!AI_ON) {
    return {
      needSummary: AI_OFF_MESSAGE,
      provideSummary: AI_OFF_MESSAGE,
    }
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: summariesSchema,
    },
  })

  if (!response || !response.text) {
    throw new Error("Could not generate intention for embedding")
  }

  const summaries = summariesSchema.parse(JSON.parse(response.text))
  return summaries
}
