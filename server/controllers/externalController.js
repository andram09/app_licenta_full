import { fetchOpenTripMapByKinds, fetchOpenTripMapByName, fetchCitySuggestions } from "../services/externalPlacesService.js";

export const externalController = {

  // GET /external/places?lat=...&lng=...&category=...
  // endpoint unificat cu mapping explicit category -> kinds OpenTripMap
  getPlacesByCategory: async (req, res) => {
    try {
      const { lat, lng, category } = req.query;

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

      // mapping explicit: categoria din frontend -> kinds OpenTripMap
      // folosim doar top-level kinds garantate de API (nu subcategorii compuse)
      const KINDS_MAP = {
        museums: "museums",
        historic: "historic,religion",
        architecture: "architecture,interesting_places",
        parks: "natural,amusements",
        restaurants: "restaurants,foods",
        cafes: "cafes,bars",
      };

      const kinds = KINDS_MAP[category];

      if (!kinds) {
        return res.status(400).json({
          message: `Unknown category "${category}". Accepted: ${Object.keys(KINDS_MAP).join(", ")}`
        });
      }

      const RATE_MAP = {
        restaurants: 1,
        cafes: 1,
      };
      const rate = RATE_MAP[category] ?? 2;

      const data = await fetchOpenTripMapByKinds(latitude, longitude, kinds, rate);

      return res.status(200).json(data);

    } catch (error) {
      console.error("OpenTripMap places error:", error.message);
      return res.status(500).json({ message: "Failed to fetch places." });
    }
  },

  // GET /external/search?name=...&lat=...&lng=...&radius=...
  // Autocomplete locuri turistice dupa text, in jurul coordonatelor date
  searchPlacesByName: async (req, res) => {
    try {
      const { name, lat, lng, radius } = req.query;

      if (!name || name.trim().length < 3) {
        return res.status(400).json({ message: "Query must have at least 3 characters." });
      }

      const latitude = Number(lat);
      const longitude = Number(lng);

      if (
        isNaN(latitude) || isNaN(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180
      ) {
        return res.status(400).json({ message: "Invalid latitude or longitude." });
      }

      const r = radius ? Math.min(Number(radius), 10000) : 5000;
      const data = await fetchOpenTripMapByName(name.trim(), latitude, longitude, r);

      return res.status(200).json(data);

    } catch (error) {
      console.error("OpenTripMap search error:", error.message);
      return res.status(500).json({ message: "Failed to search places." });
    }
  },

  // GET /external/cities?query=...
  // autocomplete orase cu api Nominatim
  getCities: async (req, res) => {
    try {
      const { query } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({ message: "Query must have at least 2 characters." });
      }

      // apelam Nominatim cu raspuns in romana
      const results = await fetchCitySuggestions(query.trim(), "ro");

      return res.status(200).json({ data: results });

    } catch (error) {
      console.error("Nominatim geocoding error:", error.message);
      return res.status(500).json({ message: "Failed to fetch city suggestions." });
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