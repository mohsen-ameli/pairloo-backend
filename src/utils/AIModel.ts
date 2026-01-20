import { ai, openai } from "../server"
import { AI_ON } from "./constants"

export async function AIModel(contents: any): Promise<string | undefined | null> {
  if (!AI_ON) {
    return `\`\`\`json{
      "type": "short_answer",
      "question": "You have disabled AI mode in the backend env file. Therefore, this is a placeholder value. Enable AI mode to get actual questions.",
      "options": []
    }`
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
  })
  return response.text === "NO_QUESTION" ? null : response.text
}

export async function getEmbedding(contents: string): Promise<number[]> {
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
