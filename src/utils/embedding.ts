import { pipeline } from "@xenova/transformers";

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (normA * normB);
}

export async function getEmbedding(sentence: string) {
  // Create feature extraction pipeline
  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  // Get embedding
  const result = await extractor(sentence, {
    pooling: "mean",
    normalize: true,
  });

  // Convert to array
  const embedding = Array.from(result.data);
  return embedding;
}
