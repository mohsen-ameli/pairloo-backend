import { Router } from "express";
import { productPost } from "../controllers/product.controler";
import { allPostsGet } from "../controllers/posts.controler";
import {
  specificPostGet,
  specificPostDelete,
} from "../controllers/posts.controler";

const router = Router();

router.post("/products", productPost);
router.get("/all-posts", allPostsGet);
router.get("/:id", specificPostGet);
router.delete("/:id", specificPostDelete);

export default router;
