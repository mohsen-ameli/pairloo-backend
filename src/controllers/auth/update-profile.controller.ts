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
        const versionedFileName = `${userId}-${Date.now()}`
        const key = await sendObject(
          "user-pictures",
          req.file.buffer,
          req.file.mimetype,
          versionedFileName
        )
        url = await getObject(key)
        updates.picture = key
      } catch (err) {
        console.error("Error uploading profile picture:", err)
        return res.status(500).json({ error: "Failed to upload profile picture." })
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { returnDocument: "after" })
      .select(
        "_id username firstName lastName phoneNumber country city state latitude longitude timezone locationId email picture"
      )
      .lean()
    if (!updatedUser) return res.status(404).json({ error: "User not found" })

    await User.updateUserPicture(updatedUser)

    return res.status(200).json(updatedUser)
  } catch (err) {
    console.error("Error updating profile:", err)
    return res.status(500).json({ error: "Server error" })
  }
}
