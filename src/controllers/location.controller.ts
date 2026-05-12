import { Request, Response } from "express"
import Location from "../models/location.model"
import mongoose from "mongoose"

type LocationType = mongoose.Document & {
  name: string
  country_name: string
  state_name: string
  population: number
  location: {
    type: string
    coordinates: [number, number]
  }
  timezone: string
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
          location: 1,
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

export const getClosestLocation = async (req: Request, res: Response) => {
  try {
    const latitude = req.query.latitude as string
    const longitude = req.query.longitude as string

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required" })
    }

    const closestLocation: LocationType | null = await Location.findOne({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
        },
      },
    })

    if (!closestLocation) {
      return res.status(404).json({ error: "No nearby location found" })
    }

    res.json(closestLocation)
  } catch (error) {
    console.error("Error finding closest location:", error)
    res.status(500).json({ error: "Failed to find closest location" })
  }
}
