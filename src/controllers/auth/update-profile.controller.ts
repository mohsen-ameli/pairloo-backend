import { Request, Response } from "express";
import User from "../../models/user.model";

export async function updateProfile(req: Request, res: Response) {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const allowedFields = ["firstName", "lastName", "phoneNumber", "country", "city"];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in req.body) updates[field] = req.body[field];
    } 
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      country: user.country,
      city: user.city,
      email: user.email,
      picture: user.picture,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
