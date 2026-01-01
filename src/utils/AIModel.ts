import { ai } from "../server";

export async function AIModel(contents: any) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
  });
  return response.text === "NO_QUESTION" ? null : response.text;
}

export async function getEmbedding(contents: string) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents,
  });
  if (!response.embeddings || response.embeddings.length === 0) {
    throw new Error("No embeddings returned from AI model");
  }
  return response.embeddings[0].values;
}
