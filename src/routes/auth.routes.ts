import { Router } from "express";
import { signupPost } from "../controllers/auth/auth.controler";
import { authorizeGet } from "../controllers/auth/authorize.controler";
import { callbackGet } from "../controllers/auth/callback.controller";
import { tokenPost } from "../controllers/auth/token.controler";
import { refreshTokenPost } from "../controllers/auth/refresh-token.controler";
import { requestEmailVerification } from "../controllers/auth/request-email-verification.controler";
import { verifyEmailCode } from "../controllers/auth/verify-email-code.controler";
import { updateProfile } from "../controllers/auth/update-profile.controller";
import  authMiddleware  from "../middleware/auth.middleware";

const router = Router();

router.post("/signup", signupPost);
router.post("/request-email-verification", requestEmailVerification);
router.post("/verify-email-code", verifyEmailCode);
router.get("/authorize", authorizeGet);
router.get("/callback", callbackGet);
router.post("/token", tokenPost);
router.post("/refresh-token", refreshTokenPost);
router.patch("/update-profile", authMiddleware, updateProfile);

export default router;
