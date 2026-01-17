/* global use, db */
/**
 * Get autocomplete suggestions for location names.
 */

use("test");

const query = "toronto";

const locations = db.locations.aggregate([
  {
    $search: {
      index: "location_autocomplete",
      autocomplete: {
        query: query,
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
      score: {
        $meta: "searchScore",
      },
    },
  },
]);

const sortedLocations = locations
  .toArray()
  .sort((a, b) => b.population - a.population);

sortedLocations;
