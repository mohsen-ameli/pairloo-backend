import { Router } from "express"
import { signupPost } from "../controllers/auth/signup.controller"
import { authorizeGet } from "../controllers/auth/authorize.controller"
import { callbackGet } from "../controllers/auth/callback.controller"
import { tokenPost } from "../controllers/auth/token.controller"
import { refreshTokenPost } from "../controllers/auth/refresh-token.controller"
import { requestEmailVerification } from "../controllers/auth/request-email-verification.controller"
import { verifyEmailCode } from "../controllers/auth/verify-email-code.controller"
import { usernameAvailableGet } from "../controllers/auth/username.controller"
import { requestPhoneVerification } from "../controllers/auth/request-phone-verification.controller"
import { verifyPhoneCode } from "../controllers/auth/verify-phone-code.controller"

const router = Router()

router.post("/signup", signupPost)
router.post("/request-email-verification", requestEmailVerification)
router.post("/request-phone-verification", requestPhoneVerification)
router.post("/verify-email-code", verifyEmailCode)
router.post("/verify-phone-code", verifyPhoneCode)
router.get("/username-available", usernameAvailableGet)
router.get("/authorize", authorizeGet)
router.get("/callback", callbackGet)
router.post("/token", tokenPost)
router.post("/refresh-token", refreshTokenPost)

export default router
