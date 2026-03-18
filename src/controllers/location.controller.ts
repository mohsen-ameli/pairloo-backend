import { Request, Response } from "express"
import Location from "../models/location.model"
import mongoose from "mongoose"

type LocationType = mongoose.Document & {
  name: string
  country_name: string
  state_name: string
  population: number
  score: number
}

export const searchLocations = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string).trim()
    if (!query) {
      return res.json([])
    }

    const results: LocationType[] = await Location.aggregate([
      {
        $search: {
          index: "location_autocomplete",
          autocomplete: {
            query,
            path: "name",
          },
        },
      },
      {
        $sort: { searchScore: -1 },
      },
      { $limit: 10 },
      {
        $project: {
          name: 1,
          country_name: 1,
          state_name: 1,
          population: 1,
          latitude: 1,
          longitude: 1,
          timezone: 1,
          score: {
            $meta: "searchScore",
          },
        },
      },
      {
        $sort: { population: -1 },
      },
    ])

    res.json(results)
  } catch (error) {
    console.error("Error searching locations:", error)
    res.status(500).json({ error: "Failed to search locations" })
  }
}
