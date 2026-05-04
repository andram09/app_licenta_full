import axios from "axios";

const OPENTRIPMAP_API_KEY = process.env.OPENTRIPMAP_API_KEY;

if (!OPENTRIPMAP_API_KEY) {
  console.warn("Missing OPENTRIPMAP_API_KEY in .env");
}

// Wikidata SPARQL — returneaza locuri faimoase filtrate dupa numarul de sitelinks Wikipedia.
// sitelinks = numarul de editii Wikipedia care au articol despre acel loc => proxy fiabil pt. faima.
//
// Strategii per categorie:
//   architecture — sitelinks > 10, fara filtru de tip, exclude asezari umane (au P1082/populatie)
//   parks        — sitelinks > 2 + P31/P279* Q22698 (parc)
//   museums      — sitelinks > 2 + P31/P279* Q33506 (muzeu)
//   historic     — sitelinks > 2 + P31/P279* {monumente, castele, situri istorice}
//
// Point(lon lat) = format WKT Wikidata (longitudinea prima!)
// LIMIT 80 — unele items au mai multe P625 (coordonate multiple), fiecare = rand separat;
// deduplicarea dupa QID se face in JS, deci avem nevoie de un buffer mai mare decat 20.
// OPTIONAL+FILTER(!BOUND) e mai eficient decat FILTER NOT EXISTS in Blazegraph (motorul Wikidata).
const buildSparql = (lng, lat, typeFilter) => `
  SELECT ?item ?itemLabel ?coordinates ?sitelinks WHERE {
    SERVICE wikibase:around {
      ?item wdt:P625 ?coordinates .
      bd:serviceParam wikibase:center "Point(${lng} ${lat})"^^geo:wktLiteral .
      bd:serviceParam wikibase:radius "10" .
    }
    ?item wikibase:sitelinks ?sitelinks .
    ${typeFilter}
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul" . }
  }
  ORDER BY DESC(?sitelinks)
  LIMIT 80
`;

// OPTIONAL+FILTER(!BOUND) exclude orasele (care au P1082/populatie) fara subquery corelat

const TYPE_FILTERS = {
  architecture: `
    FILTER(?sitelinks > 10)
    OPTIONAL { ?item wdt:P1082 ?pop . }
    FILTER(!BOUND(?pop))
  `,
  parks: `
    FILTER(?sitelinks > 2)
    ?item wdt:P31/wdt:P279* wd:Q22698 .
  `,
  museums: `
    FILTER(?sitelinks > 2)
    ?item wdt:P31/wdt:P279* wd:Q33506 .
  `,
  historic: `
    FILTER(?sitelinks > 2)
    VALUES ?htype { wd:Q9259 wd:Q16560 wd:Q23413 wd:Q4989906 wd:Q210272 wd:Q839954 }
    ?item wdt:P31/wdt:P279* ?htype .
  `,
};

export const fetchWikidataAttractions = async (lat, lng, category) => {
  const typeFilter = TYPE_FILTERS[category];
  if (!typeFilter) throw new Error(`Unknown Wikidata category: ${category}`);

  const sparql = buildSparql(lng, lat, typeFilter);

  const response = await axios.get("https://query.wikidata.org/sparql", {
    params: { query: sparql, format: "json" },
    headers: {
      "Accept": "application/sparql-results+json",
      "User-Agent": "TripPlannerApp_Licenta/1.0 (moiseandra23@stud.ase.ro)"
    },
    timeout: 20000
  });

  const bindings = response.data.results?.bindings ?? [];
  const seen = new Set();

  return bindings
    .filter(row => row.item && row.itemLabel && row.coordinates)
    .map(row => {
      const match = row.coordinates.value.match(/Point\(([^ ]+) ([^ )]+)\)/);
      if (!match) return null;
      const qid = row.item.value.split("/").pop();
      return {
        external_place_id: `wikidata_${qid}`,
        title: row.itemLabel.value,
        address: null,
        kinds: category,
        coord_lat: parseFloat(match[2]),
        coord_lng: parseFloat(match[1]),
        external_provider: "WIKIDATA",
        description: null,
        source_type: "API"
      };
    })
    .filter(Boolean)
    .filter(item => {
      if (seen.has(item.external_place_id)) return false;
      seen.add(item.external_place_id);
      return true;
    })
    .slice(0, 20);
};

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://api.openstreetmap.fr/oapi/interpreter",
  "https://overpass.osm.vi-di.fr/api/interpreter",
];

const OVERPASS_FILTERS = {
  museums:      `["tourism"="museum"]`,
  historic:     `["historic"]`,
  architecture: `["tourism"="attraction"]`,
  parks:        `["leisure"="park"]`,
};

const OTM_KINDS_MAP = {
  museums:      "museums",
  historic:     "historic,archaeology",
  architecture: "architecture,interesting_places,religion,cathedrals",
  parks:        "natural,amusements",
};

// Promise.any pe 4 mirroare — primul raspuns castiga.
// overpass-api.de e sub atac DDoS (aprilie 2026), mirrorele pot fi instabile.
export const fetchOverpassAttractions = async (lat, lng, category) => {
  const filter = OVERPASS_FILTERS[category] || `["tourism"="attraction"]`;
  const query = `[out:json][timeout:15];nwr${filter}["wikipedia"](around:10000,${lat},${lng});out center 40;`;

  let response;
  try {
    response = await Promise.any(
      OVERPASS_MIRRORS.map(endpoint =>
        axios.post(endpoint, query, {
          headers: { "Content-Type": "text/plain" },
          timeout: 18000
        })
      )
    );
  } catch {
    console.error("All Overpass mirrors failed, falling back to OpenTripMap");
    const kinds = OTM_KINDS_MAP[category] || "interesting_places";
    return fetchOpenTripMapByKinds(lat, lng, kinds, 2);
  }

  const seen = new Set();

  return response.data.elements
    .filter(el => {
      const name = el.tags?.name || el.tags?.["name:en"];
      return name && (el.lat || el.center?.lat) && (el.lon || el.center?.lon);
    })
    .filter(el => {
      const name = (el.tags?.name || el.tags?.["name:en"]).trim().toLowerCase();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    })
    .map(el => ({
      external_place_id: `osm_${el.type}_${el.id}`,
      title: (el.tags?.["name:en"] || el.tags?.name).trim(),
      address: null,
      kinds: category,
      coord_lat: el.lat ?? el.center.lat,
      coord_lng: el.lon ?? el.center.lon,
      external_provider: "OVERPASS",
      description: null,
      source_type: "API"
    }));
};

export const fetchOpenTripMapByKinds = async (lat, lng, kinds, rate = 2) => {
  let response;
  try {
    response = await axios.get("https://api.opentripmap.com/0.1/en/places/radius", {
      params: {
        radius: 10000,
        lon: lng,
        lat,
        kinds,
        rate,
        format: "json",
        limit: 50,
        apikey: OPENTRIPMAP_API_KEY
      }
    });
  } catch (err) {
    console.error("OpenTripMap request failed:", err.response?.status, JSON.stringify(err.response?.data));
    throw err;
  }

  const seen = new Set();

  return response.data
    .filter(place => place.name && place.name.trim().length > 0)
    .filter(place => place.point?.lat && place.point?.lon)
    .filter(place => !place.dist || place.dist <= 10000)
    .sort((a, b) => (b.rate || 0) - (a.rate || 0))
    .filter(place => {
      const key = place.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20)
    .map(place => ({
      external_place_id: place.xid,
      title: place.name.trim(),
      address: null,
      kinds: place.kinds || null,
      coord_lat: place.point.lat,
      coord_lng: place.point.lon,
      external_provider: "OPENTRIPMAP",
      description: null,
      source_type: "API"
    }));
};

const POI_CLASSES = new Set(["tourism", "amenity", "historic", "leisure", "natural", "shop", "building"]);

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

// Nominatim face full-text search (nu doar prefix), deci "eiffel" gaseste "Tour Eiffel",
// spre deosebire de OpenTripMap autosuggest care face prefix matching.
// bounded: 0 biaseaza rezultatele spre viewbox fara sa restrictioneze strict aria.
export const fetchOpenTripMapByName = async (name, lat, lng, radius = 5000) => {
  const degOffset = 0.45; // ~50km — suficient pentru orice obiectiv al unui oras
  const viewbox = `${lng - degOffset},${lat + degOffset},${lng + degOffset},${lat - degOffset}`;

  let response;
  try {
    response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: name,
        format: "json",
        limit: 10,
        viewbox,
        bounded: 0,
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
      external_provider: "OPENTRIPMAP",
      description: null,
      source_type: "API"
    }));
};

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

  return response.data.map(place => ({
    name: place.address?.city
      || place.address?.town
      || place.address?.village
      || place.address?.municipality
      || place.display_name.split(",")[0].trim(),
    country: place.address?.country || null,
    display_label: [
      place.address?.city || place.address?.town || place.address?.village || place.address?.municipality,
      place.address?.country
    ].filter(Boolean).join(", "),
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon)
  }));
};

export const reverseGeocodeCoords = async (coordsList) => {
  const results = new Map();

  const promises = coordsList.map(async (item) => {
    try {
      const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: {
          lat: item.lat,
          lon: item.lng,
          format: "json",
          "accept-language": "ro",
          zoom: 18,
          addressdetails: 1
        },
        headers: { "User-Agent": "TripPlannerApp_Licenta/1.0" },
        timeout: 8000
      });

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
