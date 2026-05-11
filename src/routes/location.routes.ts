import { Router } from "express"
import { getClosestLocation, searchLocations } from "../controllers/location.controller"

const router = Router()

router.get("/search", searchLocations)
router.get("/closest-location", getClosestLocation)

export default router
