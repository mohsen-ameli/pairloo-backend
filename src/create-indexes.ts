import Location from "./models/location.model"
import User from "./models/user.model"

/**
 * These are indexes we need for querying locations and users.
 * Run this script after deployment to a new server.
 */

async function createIndexes() {
  try {
    await Location.collection.createIndex({ location: "2dsphere" })

    await Location.collection.createSearchIndex({
      name: "location_autocomplete",
      type: "search",
      definition: {
        mappings: {
          dynamic: true,
          fields: {
            name: {
              type: "autocomplete",
            },
          },
        },
        storedSource: true,
      },
    })
  } catch (error) {
    console.error("Error creating location autocomplete index:", error)
  }

  try {
    await User.collection.createSearchIndex({
      name: "user_search",
      type: "search",
      definition: {
        mappings: {
          dynamic: true,
          fields: {
            firstName: {
              type: "autocomplete",
            },
            lastName: {
              type: "autocomplete",
            },
            username: {
              type: "autocomplete",
            },
          },
        },
        storedSource: {
          include: ["firstName", "lastName", "username", "picture"],
        },
      },
    })
    console.log("User search index created")
  } catch (error) {
    console.error("Error creating user search index:", error)
  }
}
