import multer from "multer"
import { updateProfile } from "../controllers/users/update-profile.controller"
import { Router } from "express"

const upload = multer({ storage: multer.memoryStorage() })

const settingsRoute = Router()

settingsRoute.post("/update-profile", upload.single("picture"), updateProfile)

export default settingsRoute
