import { Router } from "express";
import { myPostGet, postListGet } from "../controllers/posts.controler";
import { postGet, postDelete } from "../controllers/posts.controler";
import { feedGet } from "../controllers/feed.controler";

const router = Router();

router.get("/my-feed", feedGet);
router.get("/my-posts", postListGet);
router.get("/my-posts/:id", myPostGet);
router.get("/:id", postGet);
router.delete("/:id", postDelete);

export default router;
