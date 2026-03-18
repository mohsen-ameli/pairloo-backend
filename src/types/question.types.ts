import { z } from "zod"

export const questionSchema = z.object({
  intention: z.enum(["need", "provide"]).optional(),
  type: z.enum(["short_answer", "multiple_choice", "multi_select"]),
  question: z.string(),
  options: z.array(z.string()).optional(),
})

export type Question = z.infer<typeof questionSchema>

export const summariesSchema = z.object({
  needSummary: z.string(),
  provideSummary: z.string(),
})

export type Summaries = z.infer<typeof summariesSchema>
