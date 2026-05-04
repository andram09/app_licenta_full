import {fetchWikidataAttractions, fetchOpenTripMapByKinds, fetchOverpassAttractions,
  fetchOpenTripMapByName, fetchCitySuggestions, reverseGeocodeCoords} from "../services/externalPlacesService.js";

const placesCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 ora

const getCached = (key) => {
  const entry = placesCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { placesCache.delete(key); return null; }
  return entry.data;
};
const setCache = (key, data) => {
  placesCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
};

const KINDS_MAP = {
  museums:      "museums",
  historic:     "historic,archaeology",
  architecture: "architecture,interesting_places,religion,cathedrals",
  parks:        "natural,amusements",
  restaurants:  "restaurants,foods",
  cafes:        "cafes,bars",
};

const FOOD_CATEGORIES = new Set(["restaurants", "cafes"]);

export const externalController = {
  // GET /external/places?lat=...&lng=...&category=...
  getPlacesByCategory: async (req, res) => {
    try {
      const { lat, lng, category } = req.query;

      const latitude = Number(lat);
      const longitude = Number(lng);

      if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ message: "Invalid latitude or longitude." });
      }

      const kinds = KINDS_MAP[category];
      if (!kinds) {
        return res.status(400).json({
          message: `Unknown category "${category}". Accepted: ${Object.keys(KINDS_MAP).join(", ")}`
        });
      }

      const cacheKey = `${category}_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
      const cached = getCached(cacheKey);
      if (cached) {
        console.log(`[Cache] ${category} @ ${latitude},${longitude} → hit`);
        return res.status(200).json(cached);
      }

      let data;
      if (FOOD_CATEGORIES.has(category)) {
        data = await fetchOpenTripMapByKinds(latitude, longitude, kinds, 1);
      } else {
        // 1. Wikidata SPARQL (primar — sitelinks ca proxy pentru faima)
        // 2. Overpass cu Promise.any pe 4 mirroare (secundar)
        // 3. OpenTripMap (tertiar, in fallback-ul Overpass)
        try {
          data = await fetchWikidataAttractions(latitude, longitude, category);
          console.log(`[Wikidata] ${category} @ ${latitude},${longitude} → ${data.length} results`);
          if (!data || data.length === 0) throw new Error("Wikidata returned 0 results");
        } catch (wikidataErr) {
          console.warn(`[Wikidata] Failed (${wikidataErr.message}), trying Overpass`);
          data = await fetchOverpassAttractions(latitude, longitude, category);
          console.log(`[Overpass/OTM] ${category} → ${data.length} results`);
        }
      }

      setCache(cacheKey, data);
      return res.status(200).json(data);

    } catch (error) {
      console.error("Places fetch error:", error.message);
      return res.status(500).json({ message: "Failed to fetch places." });
    }
  },

  // GET /external/search?name=...&lat=...&lng=...&radius=...
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
      console.error("Place search error:", error.message);
      return res.status(500).json({ message: "Failed to search places." });
    }
  },

  // GET /external/cities?query=...
  getCities: async (req, res) => {
    try {
      const { query } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({ message: "Query must have at least 2 characters." });
      }

      const results = await fetchCitySuggestions(query.trim(), "ro");

      return res.status(200).json({ data: results });

    } catch (error) {
      console.error("Nominatim geocoding error:", error.message);
      return res.status(500).json({ message: "Failed to fetch city suggestions." });
    }
  },

  // POST /external/reverse-geocode
  // body: { coords: [{ external_place_id, lat, lng }] }
  reverseGeocode: async (req, res) => {
    try {
      const { coords } = req.body;

      if (!Array.isArray(coords) || coords.length === 0) {
        return res.status(400).json({ message: "coords must be a non-empty array." });
      }

      if (coords.length > 20) {
        return res.status(400).json({ message: "Maximum 20 coordinates per request." });
      }

      for (const item of coords) {
        if (!item.external_place_id || item.lat === undefined || item.lng === undefined) {
          return res.status(400).json({
            message: "Each item must have external_place_id, lat and lng."
          });
        }

        const lat = Number(item.lat);
        const lng = Number(item.lng);

        if (
          isNaN(lat) || isNaN(lng) ||
          lat < -90 || lat > 90 ||
          lng < -180 || lng > 180
        ) {
          return res.status(400).json({
            message: `Invalid coordinates for place ${item.external_place_id}.`
          });
        }
      }

      const addressMap = await reverseGeocodeCoords(coords);

      const result = {};
      for (const [id, address] of addressMap.entries()) {
        result[id] = address;
      }

      return res.status(200).json({ data: result });

    } catch (error) {
      console.error("Reverse geocode error:", error.message);
      return res.status(500).json({ message: "Failed to reverse geocode coordinates." });
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
