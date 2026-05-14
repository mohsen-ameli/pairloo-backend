import { Router } from "express"
import { myPostGet } from "../controllers/posts.controller"
import { postGet, postDelete, postStatusUpdate, postUpdate } from "../controllers/posts.controller"
import { feedGet } from "../controllers/feed.controller"
import { postInteraction } from "../controllers/interaction.controller"
import multer from "multer"

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.get("/my-feed", feedGet)
router.get("/my-posts/:id", myPostGet)
router.get("/:id", postGet)
router.delete("/:id", postDelete)
router.patch("/:id/status", postStatusUpdate)
router.patch("/:id", upload.any(), postUpdate)
router.post("/interaction", postInteraction)

export default router
