import { Question } from "./question.types";

export type PostSession = {
  initialPostText: string;
  context: {
    question: Question;
    answer: string;
  }[];
  step: number;
  maxQuestions: number;
};
