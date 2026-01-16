/* global use, db */
/**
 * Get autocomplete suggestions for location names.
 */

use("test");

db.locations.aggregate([
  {
    $search: {
      index: "location_autocomplete",
      autocomplete: {
        query: "toron",
        path: "name",
      },
    },
  },
  {
    $limit: 10,
  },
  {
    $project: {
      name: 1,
      country_name: 1,
      state_name: 1,
      score: {
        $meta: "searchScore",
      },
    },
  },
]);
