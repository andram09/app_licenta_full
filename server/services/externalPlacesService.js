import axios from "axios";

const OPENTRIPMAP_API_KEY = process.env.OPENTRIPMAP_API_KEY;

if (!OPENTRIPMAP_API_KEY) {
  console.warn("Missing OPENTRIPMAP_API_KEY in .env");
}

// delay helper pentru rate limiting la reverse geocoding
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// fetch locuri de interes din OpenTripMap cu filtrare imbunatatita
// returneaza doar campurile necesare frontend-ului (nu modelul Objective complet)
export const fetchOpenTripMapByKinds = async (lat, lng, kinds, rate = 2) => {
  let response;
  try {
    response = await axios.get(
      "https://api.opentripmap.com/0.1/en/places/radius",
      {
        params: {
          radius: 6000,
          lon: lng,
          lat,
          kinds,
          rate,
          format: "json",
          limit: 20,
          apikey: OPENTRIPMAP_API_KEY
        }
      }
    );
  } catch (err) {
    console.error("OpenTripMap request failed:", err.response?.status, JSON.stringify(err.response?.data));
    throw err;
  }

  const seen = new Set(); // pentru deduplicare dupa name

  return response.data
    // elimina locurile fara nume
    .filter(place => place.name && place.name.trim().length > 0)
    // elimina locurile fara coordonate valide
    .filter(place => place.point && place.point.lat && place.point.lon)
    // elimina locatii la distanta mare (daca OpenTripMap returneaza campul dist)
    .filter(place => !place.dist || place.dist <= 6000)
    // deduplicare dupa name (pastreaza prima aparitie)
    .filter(place => {
      const key = place.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    // returnez doar campurile necesare frontend-ului
    .map(place => ({
        external_place_id: place.xid,
        title: place.name.trim(),
        address: null,
        kinds: place.kinds || null,
        // campuri necesare pentru POST /objectives/from-api
        coord_lat: place.point.lat,
        coord_lng: place.point.lon,
        external_provider: "OPENTRIPMAP",
        description: null,
        source_type: "API"
      })
    );
};

// Cauta locuri turistice dupa nume folosind Nominatim (OpenStreetMap).
// Nominatim face full-text search (nu doar prefix), deci "eiffel" gaseste "Tour Eiffel".
// OpenTripMap autosuggest facea prefix matching si nu gasea locuri al caror nume nu incepea cu query-ul.
//
// REVERT: daca vrei sa revii la OpenTripMap autosuggest, inlocuieste functia cu versiunea comentata de mai jos.
// /* VERSIUNEA VECHE CU OPENTRIPMAP AUTOSUGGEST (prefix matching):
// export const fetchOpenTripMapByName = async (name, lat, lng, radius = 5000) => {
//   let response;
//   try {
//     response = await axios.get("https://api.opentripmap.com/0.1/en/places/autosuggest", {
//       params: { name, radius, lon: lng, lat, format: "json", limit: 10, apikey: OPENTRIPMAP_API_KEY }
//     });
//   } catch (err) { throw err; }
//   const raw = response.data;
//   if (Array.isArray(raw)) {
//     return raw.filter(p => p.name?.trim() && p.point?.lat && p.point?.lon)
//       .map(p => ({ external_place_id: p.xid, title: p.name.trim(), kinds: p.kinds || null,
//         coord_lat: p.point.lat, coord_lng: p.point.lon, address: null,
//         external_provider: "OPENTRIPMAP", description: null, source_type: "API" }));
//   }
//   return [];
// };
// */

const POI_CLASSES = new Set(["tourism", "amenity", "historic", "leisure", "natural", "shop", "building"]);

export const fetchOpenTripMapByName = async (name, lat, lng, radius = 5000) => {
  // Calculam un bounding box in jurul coordonatelor trip-ului pentru a biaса rezultatele
  // ~0.45 grade ≈ 50km — suficient pentru orice obiectiv al unui oras
  const degOffset = 0.45;
  const viewbox = `${lng - degOffset},${lat + degOffset},${lng + degOffset},${lat - degOffset}`;

  let response;
  try {
    response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: name,
        format: "json",
        limit: 10,
        viewbox,
        bounded: 0, // biaseaza spre viewbox dar nu restrictioneaza strict
        "accept-language": "en",
        addressdetails: 0,
        namedetails: 1
      },
      headers: {
        "User-Agent": "TripPlannerApp_Licenta/1.0 (moiseandra23@stud.ase.ro)"
      },
      timeout: 8000
    });
  } catch (err) {
    console.error("Nominatim place search failed:", err.code, err.message);
    throw err;
  }

  return response.data
    .filter(p => p.lat && p.lon)
    .filter(p => POI_CLASSES.has(p.class))
    .map(p => ({
      external_place_id: `nominatim_${p.osm_type}_${p.osm_id}`,
      title: (p.namedetails?.name || p.display_name.split(",")[0]).trim(),
      kinds: p.type || null,
      coord_lat: parseFloat(p.lat),
      coord_lng: parseFloat(p.lon),
      address: null,
      // external_provider ramane OPENTRIPMAP pentru compatibilitate cu ENUM-ul din DB
      // (alter: false in server.js, deci schema nu se modifica automat)
      external_provider: "OPENTRIPMAP",
      description: null,
      source_type: "API"
    }));
};

// cauta orase prin Nominatim (OpenStreetMap) cu raspuns in engleza
export const fetchCitySuggestions = async (query, lang = "ro") => {
  let response;
  try {
    response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: query,
        format: "json",
        limit: 7,
        "accept-language": lang,
        addressdetails: 1,
        namedetails: 1
      },
      headers: {
        "User-Agent": "TripPlannerApp_Licenta/1.0 (moiseandra23@stud.ase.ro)"
      },
      timeout: 8000
    });
  } catch (err) {
    console.error("Nominatim request failed:", err.code, err.message);
    throw err;
  }

  if (response.data.length === 0) {
    return [];
  }

  return response.data.map(place => ({
    name: place.address?.city
      || place.address?.town
      || place.address?.village
      || place.address?.municipality
      || place.display_name.split(",")[0].trim(),
    country: place.address?.country || null,
    display_label: [
      place.address?.city || place.address?.town || place.address?.village || place.address?.municipality,
      // place.namedetails?.["name:ro"] || place.namedetails?.["name:en"] || place.address?.state,
      place.address?.country
    ].filter(Boolean).join(", "),
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon)
  }));
};


// reverse geocoding batch pentru o lista de coordonate
// Nominatim: max 1 request/secunda, deci procesam secvential cu delay
export const reverseGeocodeCoords = async (coordsList) => {
  const results = new Map();

  const promises = coordsList.map(async (item) => {
    try {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/reverse",
        {
          params: {
            lat: item.lat,
            lon: item.lng,
            format: "json",
            "accept-language": "ro",
            zoom: 18,
            addressdetails: 1
          },
          headers: {
            "User-Agent": "TripPlannerApp_Licenta/1.0"
          },
          timeout: 8000
        }
      );

      const addr = response.data?.address;

      if (!addr) {
        results.set(item.external_place_id, null);
      } else {
        const parts = [
          addr.road && addr.house_number
            ? `${addr.road} ${addr.house_number}`
            : addr.road || null,
          addr.city || addr.town || addr.village || addr.municipality || null,
          addr.country || null
        ].filter(Boolean);

        results.set(
          item.external_place_id,
          parts.length > 0 ? parts.join(", ") : null
        );
      }
    } catch (err) {
      console.error(
        `Nominatim reverse geocode failed for ${item.external_place_id}:`,
        err.message
      );
      results.set(item.external_place_id, null);
    }
  });

  await Promise.all(promises);

  return results;
};



// import axios from "axios";

// const OPENTRIPMAP_API_KEY = process.env.OPENTRIPMAP_API_KEY;
// const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY;

// if (!OPENTRIPMAP_API_KEY) {
//   console.warn("Missing OPENTRIPMAP_API_KEY in .env");
// }

// if (!FOURSQUARE_API_KEY) {
//   console.warn("Missing FOURSQUARE_API_KEY in .env");
// }

// //Normalizează pentru modelul Objective
// const normalizeObjective = ({
//   id,
//   title,
//   description,
//   lat,
//   lng,
//   address,
//   provider
// }) => ({
//   title,
//   description: description || null,
//   coord_lat: lat,
//   coord_lng: lng,
//   address: address || null,
//   source_type: "API",
//   external_place_id: id,
//   external_provider: provider
// });


// //OpenTripMap -> obiective culturale

// export const fetchOpenTripMap = async (lat, lng, radius = 5000) => {
//   const response = await axios.get(
//     "https://api.opentripmap.com/0.1/en/places/radius",
//     {
//       params: {
//         radius,
//         lon: lng,
//         lat,
//         kinds: "cultural,historic,museums,architecture,natural",
//         format: "json",
//         limit: 20,
//         apikey: OPENTRIPMAP_API_KEY
//       }
//     }
//   );

//   return response.data
//     .filter(place => place.name && place.name.trim().length > 0)
//     .map(place => normalizeObjective({
//         id: place.xid,
//         title: place.name,
//         description: null,
//         lat: place.point.lat,
//         lng: place.point.lon,
//         provider: "OPENTRIPMAP"
//       })
//     );
// };


// //Foursquare -> restaurante & lifestyle

// export const fetchFoursquare = async (lat, lng, category) => {
//   const categoryMap = { //id-uri de categorie
//     restaurant: "13065",
//     cafe: "13032",
//     bar: "13003",
//     nightlife: "10032"
//   };

//   const response = await axios.get(
//     "https://api.foursquare.com/v3/places/search",
//     {
//       headers: {
//         Authorization: FOURSQUARE_API_KEY
//       },
//       params: {
//         ll: `${lat},${lng}`,
//         categories: categoryMap[category],
//         limit: 20
//       }
//     }
//   );

//   return response.data.results.map(place => normalizeObjective({
//       id: place.fsq_id,
//       title: place.name,
//       description: null,
//       lat: place.geocodes.main.latitude,
//       lng: place.geocodes.main.longitude,
//       address: place.location?.formatted_address || null,
//       provider: "FOURSQUARE"
//     })
//   );
// };