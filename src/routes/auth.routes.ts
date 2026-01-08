import { Router } from "express";
import { signupPost } from "../controllers/auth/auth.controller";
import { authorizeGet } from "../controllers/auth/authorize.controller";
import { callbackGet } from "../controllers/auth/callback.controller";
import { tokenPost } from "../controllers/auth/token.controller";
import { refreshTokenPost } from "../controllers/auth/refresh-token.controller";
import { requestEmailVerification } from "../controllers/auth/request-email-verification.controller";
import { verifyEmailCode } from "../controllers/auth/verify-email-code.controller";

const router = Router();

router.post("/signup", signupPost);
router.post("/request-email-verification", requestEmailVerification);
router.post("/verify-email-code", verifyEmailCode);
router.get("/authorize", authorizeGet);
router.get("/callback", callbackGet);
router.post("/token", tokenPost);
router.post("/refresh-token", refreshTokenPost);

export default router;
