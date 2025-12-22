import { Router } from "express";
import { loginPost, signupPost } from "../controllers/auth/auth.controler";
import { authorizeGet } from "../controllers/auth/authorize.controler";
import { callbackGet } from "../controllers/auth/callback.controller";
import { tokenPost } from "../controllers/auth/token.controler";
import { refreshTokenPost } from "../controllers/auth/refresh-token.controler";

const router = Router();

router.post("/signup", signupPost);
router.post("/login", loginPost);
router.get("/authorize", authorizeGet);
router.get("/callback", callbackGet);
router.post("/token", tokenPost);
router.post("/refresh-token", refreshTokenPost);

export default router;
