import { Router } from "express";
import { postListGet } from "../controllers/posts.controller";
import { postGet, postDelete } from "../controllers/posts.controller";
import { feedGet } from "../controllers/feed.controller";

const router = Router();

router.get("/my-feed", feedGet);
router.get("/my-posts", postListGet);
router.get("/:id", postGet);
router.delete("/:id", postDelete);

export default router;
