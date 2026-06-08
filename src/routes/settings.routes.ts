import { updateProfile } from "../controllers/users/update-profile.controller"
import { Router } from "express"
import { upload } from "../server"

const settingsRoute = Router()

settingsRoute.post("/update-profile", upload.single("picture"), updateProfile)

export default settingsRoute
