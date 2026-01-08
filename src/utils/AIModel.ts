import { ai, openai } from "../server";
import { AI_ON } from "./constants";

export async function AIModel(contents: any) {
  if (!AI_ON) {
    return `\`\`\`json{
      "type": "short_answer",
      "question": "You have disabled AI mode in the backend env file. Therefore, this is a placeholder value. Enable AI mode to get actual questions.",
      "options": []
    }`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
  });
  return response.text === "NO_QUESTION" ? null : response.text;
}

export async function getEmbedding(contents: string) {
  if (!AI_ON) {
    return [1, 2, 3, 4, 5];
  }

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: contents,
  });
  if (!response.data || response.data.length === 0) {
    throw new Error("No embeddings returned from AI model");
  }
  return response.data[0].embedding;
}
