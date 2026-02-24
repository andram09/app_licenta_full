import { fetchOpenTripMapByKinds } from "../services/externalPlacesService.js";

export const externalController = {

  getCulturalPlaces: async (req, res) => {
    try {
      const { lat, lng } = req.query;

      const latitude = Number(lat);
      const longitude = Number(lng);

      if (
        isNaN(latitude) ||
        isNaN(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({ message: "Invalid latitude or longitude." });
      }

      const kinds = "cultural,historic,museums,architecture,natural";

      const data = await fetchOpenTripMapByKinds(latitude, longitude, kinds);

      return res.status(200).json(data);

    } catch (error) {
      console.error("OpenTripMap cultural error:", error.message);
      return res.status(500).json({ message: "Failed to fetch cultural places." });
    }
  },

  getLifestylePlaces: async (req, res) => {
    try {
      const { lat, lng } = req.query;

      const latitude = Number(lat);
      const longitude = Number(lng);

      if (
        isNaN(latitude) ||
        isNaN(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({ message: "Invalid latitude or longitude." });
      }

      const kinds = "restaurants,cafes,bars,fast_food";

      const data = await fetchOpenTripMapByKinds(latitude, longitude, kinds);

      return res.status(200).json(data);

    } catch (error) {
      console.error("OpenTripMap lifestyle error:", error.message);
      return res.status(500).json({ message: "Failed to fetch lifestyle places." });
    }
  }

};

// import { fetchOpenTripMap, fetchFoursquare } from "../services/externalPlacesService.js";

// //fetchOpenTripMap -> cultural, fetchFoursquare -> lifestyle

// export const externalController = {
//     //GET /external/cultural
//     getCulturalPlaces: async (req, res) => {
//         try {
//             const { lat, lng } = req.query;

//             //trb convertite din string(cum suunt in query) in Number
//             const latitude = Number(lat);
//             const longitude = Number(lng);

//             if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
//                 return res.status(400).json({ message: "Invalid latitude or longitude." });
//             }

//             const data = await fetchOpenTripMap(latitude, longitude);

//             return res.status(200).json(data);

//         } catch (error) {
//             console.error("OpenTripMap error:", error.message);
//             return res.status(500).json({ message: "Failed to fetch cultural places." });
//         }
//     },

//     //GET /external/lifestyle
//     getLifestylePlaces: async (req, res) => {
//         try {
//             const { lat, lng, category } = req.query;

//             const latitude = Number(lat);
//             const longitude = Number(lng);

//             const allowedCategories = ["restaurant", "cafe", "bar", "nightlife"];

//             if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
//                 return res.status(400).json({ message: "Invalid latitude or longitude." });
//             }

//             if (!allowedCategories.includes(category)) {
//                 return res.status(400).json({ message: "Invalid category." });
//             }

//             const data = await fetchFoursquare(latitude, longitude, category);

//             return res.status(200).json(data);

//         } catch (error) {
//             console.error("Foursquare error:", error.message);
//             return res.status(500).json({ message: "Failed to fetch lifestyle places." });
//         }
//     }
// };