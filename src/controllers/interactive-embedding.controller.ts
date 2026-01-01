import { Request, Response } from "express";
import {
  generateQuestions,
  updateContextWithAnswer,
  getFinalEmbedding,
} from "../services/interactive-embedding.service";

// Step 1: Accept text and return questions
export async function startInteractiveEmbedding(req: Request, res: Response) {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });
  const questions = await generateQuestions(text, 10);
  // Store context in session or return to client for stateful flow
  res.json({ questions });
}

// Step 2: Accept answers and return next question or embedding
export async function answerInteractiveEmbedding(req: Request, res: Response) {
  const { context, answers } = req.body;
  if (!context || !answers)
    return res.status(400).json({ error: "Context and answers required" });
  const updatedContext = await updateContextWithAnswer(context, answers);
  if (updatedContext.questions.length > 0) {
    res.json({ questions: updatedContext.questions });
  } else {
    const embedding = await getFinalEmbedding(updatedContext);
    res.json({ embedding });
  }
}
