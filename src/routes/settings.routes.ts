import { updateProfile } from "../controllers/auth/update-profile.controller"
import { Router } from "express"

const router = Router()

router.patch("/update-profile", updateProfile)

export default router
