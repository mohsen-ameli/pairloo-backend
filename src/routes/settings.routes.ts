import { updateProfile } from "../controllers/auth/update-profile.controller";
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "Settings endpoint (protected)" });
});
router.patch("/update-profile", updateProfile);

export default router;