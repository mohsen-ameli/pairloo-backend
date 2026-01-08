import { Router } from "express";
import { myPostGet, postListGet } from "../controllers/posts.controller";
import { postGet, postDelete } from "../controllers/posts.controller";
import { feedGet } from "../controllers/feed.controller";

const router = Router();

router.get("/my-feed", feedGet);
router.get("/my-posts", postListGet);
router.get("/my-posts/:id", myPostGet);
router.get("/:id", postGet);
router.delete("/:id", postDelete);

export default router;
