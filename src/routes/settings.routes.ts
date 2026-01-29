import multer from "multer"
import { updateProfile } from "../controllers/auth/update-profile.controller"
import { Router } from "express"

const upload = multer({ storage: multer.memoryStorage() })

const router = Router()

router.post("/update-profile", upload.single("picture"), updateProfile)

export default router
