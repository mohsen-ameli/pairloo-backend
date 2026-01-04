import { ai } from "../server";
import { AI_ON } from "./constants";

export async function AIModel(contents: any) {
  if (!AI_ON) {
    return "This is a placeholder response from the AI model.";
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

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents,
  });
  if (!response.embeddings || response.embeddings.length === 0) {
    throw new Error("No embeddings returned from AI model");
  }
  return response.embeddings[0].values;
}
