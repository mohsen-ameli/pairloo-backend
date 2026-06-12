import { updateProfile } from "../controllers/users/update-profile.controller"
import { Router } from "express"
import multer from "multer"

const settingsRoute = Router()

settingsRoute.post("/update-profile", multer().single("picture"), updateProfile)

export default settingsRoute
