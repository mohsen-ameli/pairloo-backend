import { Router } from "express";
import {
  startInteractiveEmbedding,
  answerInteractiveEmbedding,
} from "../controllers/interactive-embedding.controller";

const router = Router();

router.post("/start", startInteractiveEmbedding);
router.post("/answer", answerInteractiveEmbedding);

export default router;
