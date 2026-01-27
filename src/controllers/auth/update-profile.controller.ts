import { Request, Response } from "express"
import User from "../../models/user.model"
import { getObject, sendObject } from "../../utils/s3"

export async function updateProfile(req: Request, res: Response) {
  try {
    const userId = req.user?.sub
    if (!userId) return res.status(401).json({ error: "Unauthorized" })
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: "User not found" })

    const allowedFields = [
      "pictureMimeType",
      "firstName",
      "lastName",
      "country",
      "city",
      "state",
      "latitude",
      "longitude",
      "timezone",
      "locationId",
    ]
    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (field in req.body) updates[field] = req.body[field]
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." })
    }

    let url: string | null = null

    if (req.file) {
      try {
        const key = await sendObject(
          "user-pictures",
          req.file.buffer,
          updates.pictureMimeType,
          userId
        )
        url = await getObject(key)
        updates.picture = {
          key,
          url,
          mimeType: updates.pictureMimeType,
          createdAt: new Date(),
        }
      } catch (err) {
        console.error("Error uploading profile picture:", err)
        return res.status(500).json({ error: "Failed to upload profile picture." })
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true })
    if (!updatedUser) return res.status(404).json({ error: "User not found" })

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phoneNumber: updatedUser.phoneNumber,
      country: updatedUser.country,
      city: updatedUser.city,
      state: updatedUser.state,
      latitude: updatedUser.latitude,
      longitude: updatedUser.longitude,
      timezone: updatedUser.timezone,
      locationId: updatedUser.locationId,
      email: updatedUser.email,
      picture: updatedUser.picture,
    })
  } catch (err) {
    res.status(500).json({ error: "Server error" })
  }
}
