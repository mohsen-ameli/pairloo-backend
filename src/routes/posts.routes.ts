import { Router } from "express"
import { myPostGet } from "../controllers/posts.controller"
import { postGet, postDelete, postStatusUpdate } from "../controllers/posts.controller"
import { feedGet } from "../controllers/feed.controller"
import { postInteraction } from "../controllers/interaction.controller"
import { myEditPostGet, postUpdate } from "../controllers/edit-post.controller"

import multer from "multer"
import { reportPost } from "../controllers/report.controller"

const router = Router()

router.get("/my-feed", feedGet)
router.get("/my-posts/:id", myPostGet)
router.get("/:id", postGet)
router.delete("/:id", postDelete)

router.put("/report", reportPost)

router.post("/interaction", postInteraction)

// Edit post
router.post("/edit-post/:id", multer().array("newImages"), postUpdate)
router.get("/edit-post/:id", myEditPostGet)
// TODO: Merge status update into edit post
router.patch("/:id/status", postStatusUpdate)

export default router
