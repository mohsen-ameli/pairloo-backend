import { Request, Response } from 'express';
import Location from '../models/location.model';

export const searchLocations = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string).trim();
    if (!query) {
      return res.json([]);
    }
    const results = await Location.aggregate([
      {
        $search: {
          index: "location_autocomplete",
          autocomplete: {
            query,
            path: "name"
          }
        }
      },
      { $limit: 10 },
      {
        $project: {
          name: 1,
          country_name: 1,
          state_name: 1,
          score: { $meta: "searchScore" },
          latitude: 1,
          longitude: 1,
          timezone: 1,
        }
      }
    ]);
    res.json(results);
  } catch (error) {
    console.error("Error searching locations:", error);
    res.status(500).json({ error: 'Failed to search locations' });
  }
};
