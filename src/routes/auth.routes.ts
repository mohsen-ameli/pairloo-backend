import { Router } from "express";
import { loginPost, signupPost } from "../controllers/auth.controler";
import {
  authorizeGet,
  callbackGet,
  tokenPost,
} from "../controllers/google.controler";

const router = Router();

router.post("/signup", signupPost);
router.post("/login", loginPost);
router.get("/authorize", authorizeGet);
router.get("/callback", callbackGet);
router.post("/token", tokenPost);

export default router;
