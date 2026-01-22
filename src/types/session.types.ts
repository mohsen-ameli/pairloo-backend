import { Question } from "./question.types"

export type QnaType = { question: Question; answer: string[] }[]

export type PostSession = {
  initialPostText: string
  context: QnaType
  maxQuestions: number
}
