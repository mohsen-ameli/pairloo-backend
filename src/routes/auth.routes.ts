import { Router } from "express";
import { loginPost, signupPost } from "../controllers/auth.controler";
import { authorizeGet } from "../controllers/authorize.controler";
import { callbackGet } from "../controllers/callback.controller";
import { tokenPost } from "../controllers/token.controler";
import { refreshTokenPost } from "../controllers/refresh-token.controler";

const router = Router();

router.post("/signup", signupPost);
router.post("/login", loginPost);
router.get("/authorize", authorizeGet);
router.get("/callback", callbackGet);
router.post("/token", tokenPost);
router.post("/refresh-token", refreshTokenPost);

export default router;
