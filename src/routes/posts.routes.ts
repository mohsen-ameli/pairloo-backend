import { Router } from "express"
import { myPostGet } from "../controllers/posts.controller"
import { postGet, postDelete, postStatusUpdate } from "../controllers/posts.controller"
import { feedGet } from "../controllers/feed.controller"
import { postInteraction } from "../controllers/interaction.controller"

const router = Router()

router.get("/my-feed", feedGet)
router.get("/my-posts/:id", myPostGet)
router.get("/:id", postGet)
router.delete("/:id", postDelete)
router.patch("/:id/status", postStatusUpdate)
router.post("/interaction", postInteraction)

export default router
