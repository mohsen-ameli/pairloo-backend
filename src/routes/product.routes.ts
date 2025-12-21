import { Router } from "express";
import {
  createProduct,
  getProducts,
  getAllProducts,
  getProductById,
} from "../controllers/product.controller";
import authMiddleware from "../middleware/auth.middleware";

const router = Router();


router.post("/", authMiddleware, createProduct);
router.get("/my-products", authMiddleware, getProducts);
router.get("/all", getAllProducts);
router.get("/:id", getProductById);

export default router;
