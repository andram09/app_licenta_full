import axios from "axios";

const OPENTRIPMAP_API_KEY = process.env.OPENTRIPMAP_API_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!OPENTRIPMAP_API_KEY) {
  console.warn("Missing OPENTRIPMAP_API_KEY in .env");
}

if (!GOOGLE_PLACES_API_KEY) {
  console.warn("Missing GOOGLE_PLACES_API_KEY in .env");
}

// Google Places API (New) — sursa principala pentru obiective + imagini.
// Tipuri din Table A (Places API New); pot fi reglate per categorie.


const GOOGLE_TYPES_MAP = {
  museums:      ["museum", "art_gallery"],
  historic:     ["historical_landmark", "historical_place", "monument"],
  architecture: ["tourist_attraction", "church"],
  parks:        ["park", "national_park", "garden", "botanical_garden"],
  restaurants:  ["restaurant"],
  cafes:        ["cafe", "coffee_shop"],
};

// Place Photo (New) cu skipHttpRedirect=true → JSON { photoUri } (URL googleusercontent
// direct afisabil, fara a expune cheia in client). Returneaza null daca esueaza.


const fetchGooglePhotoUri = async (photoName) => {
  try {
    const response = await axios.get(
      `https://places.googleapis.com/v1/${photoName}/media`,
      {
        params: { maxWidthPx: 400, skipHttpRedirect: true, key: GOOGLE_PLACES_API_KEY },
        timeout: 8000,
      }
    );
    return response.data?.photoUri ?? null;
  } catch {
    return null;
  }
};

// Nearby Search (New) — POI ordonate dupa popularitate, in raza de 10km.
// Pastreaza doar locurile care au cel putin o poza (cele fara se ascund).


export const fetchGooglePlacesByCategory = async (lat, lng, category) => {
  const includedTypes = GOOGLE_TYPES_MAP[category];
  if (!includedTypes) throw new Error(`Unknown Google category: ${category}`);
  if (!GOOGLE_PLACES_API_KEY) throw new Error("Missing GOOGLE_PLACES_API_KEY");

  const response = await axios.post(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      includedTypes,
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 10000,
        },
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.types",
      },
      timeout: 12000,
    }
  );

  const candidates = (response.data?.places ?? []).filter(
    (p) => p.id && p.displayName?.text && p.location && p.photos?.length
  );

  const withImages = await Promise.all(
    candidates.map(async (p) => {
      const image_url = await fetchGooglePhotoUri(p.photos[0].name);
      if (!image_url) return null;
      return {
        external_place_id: `google_${p.id}`,
        title: p.displayName.text,
        address: p.formattedAddress ?? null,
        kinds: category,
        coord_lat: p.location.latitude,
        coord_lng: p.location.longitude,
        external_provider: "GOOGLE",
        description: null,
        source_type: "API",
        image_url,
      };
    })
  );

  return withImages.filter(Boolean);
};

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
    SERVICE wikibase:label { bd:serviceParam wikibase:language "ro,en,mul,de,fr,es,it,pt,nl" . }
  }
  ORDER BY DESC(?sitelinks)
  LIMIT 80
`;

// Query separat pentru P18 (imagine) — VALUES pe QID-uri exacte = index lookup, nu join geo-spatial.
// Mult mai rapid decat OPTIONAL { ?item wdt:P18 ?image } in query-ul principal.
const fetchP18Images = async (qids) => {
  if (!qids.length) return {};
  const values = qids.map(q => `wd:${q}`).join(" ");
  const sparql = `SELECT ?item ?image WHERE { VALUES ?item { ${values} } ?item wdt:P18 ?image . } LIMIT ${qids.length}`;
  try {
    const response = await axios.get("https://query.wikidata.org/sparql", {
      params: { query: sparql, format: "json" },
      headers: {
        "Accept": "application/sparql-results+json",
        "User-Agent": "TripPlannerApp_Licenta/1.0 (moiseandra23@stud.ase.ro)"
      },
      timeout: 10000
    });
    const result = {};
    for (const row of response.data.results?.bindings ?? []) {
      const qid = row.item?.value.split("/").pop();
      if (qid && row.image && !result[qid]) {
        result[qid] = row.image.value.replace("http://", "https://") + "?width=400";
      }
    }
    return result;
  } catch {
    return {};
  }
};

// OPTIONAL+FILTER(!BOUND) exclude orasele (care au P1082/populatie) fara subquery corelat

const TYPE_FILTERS = {
  architecture: `
    FILTER(?sitelinks > 5)
    VALUES ?archtype { wd:Q41176 wd:Q12518 wd:Q16970 wd:Q44613 wd:Q16560 wd:Q23413 wd:Q174782 wd:Q12280 wd:Q2977 wd:Q153562 wd:Q1076486 wd:Q57821 }
    ?item wdt:P31/wdt:P279* ?archtype .
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
    VALUES ?htype { wd:Q9259 wd:Q16560 wd:Q23413 wd:Q4989906 wd:Q210272 wd:Q839954 wd:Q751876 wd:Q44613 wd:Q1081138 wd:Q5193277 }
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

  const places = bindings
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
        source_type: "API",
        image_url: null,
      };
    })
    .filter(Boolean)
    .filter(item => {
      if (seen.has(item.external_place_id)) return false;
      seen.add(item.external_place_id);
      return true;
    })
    .slice(0, 20);

  const qids = places.map(p => p.external_place_id.replace("wikidata_", ""));
  const images = await fetchP18Images(qids);

  return places.map(p => ({
    ...p,
    image_url: images[p.external_place_id.replace("wikidata_", "")] ?? null,
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

  const places = response.data
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
      source_type: "API",
      image_url: null,
    }));

  // Try to match place names to Wikipedia articles for thumbnail images
  try {
    const thumbnails = await fetchWikipediaThumbnails(places.map(p => p.title));
    return places.map(p => ({ ...p, image_url: thumbnails[p.title] ?? null }));
  } catch {
    return places;
  }
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

// Photon (photon.komoot.io) e construit special pentru autocomplete/type-ahead pe date
// OSM: face prefix matching real ("Barcel" -> "Barcelona"), spre deosebire de endpoint-ul
// /search din Nominatim care la text partial intoarce rezultate fuzzy irelevante.
// layer=city restrange la asezari (city/town/village), nu strazi/POI-uri.
export const fetchCitySuggestions = async (query, lang = "ro") => {
  let response;
  try {
    response = await axios.get("https://photon.komoot.io/api/", {
      params: {
        q: query,
        limit: 7,
        lang: ["en", "de", "fr"].includes(lang) ? lang : "en",
        layer: "city"
      },
      headers: {
        "User-Agent": "TripPlannerApp_Licenta/1.0 (moiseandra23@stud.ase.ro)"
      },
      timeout: 8000
    });
  } catch (err) {
    console.error("Photon request failed:", err.code, err.message);
    throw err;
  }

  return (response.data?.features ?? [])
    // pastram doar asezari (place=city/town/village/...), nu strazi sau alte feature-uri
    .filter(f => f.properties?.osm_key === "place")
    .map(f => {
      const p = f.properties;
      const name = p.name || p.city || null;
      return {
        name,
        country: p.country || null,
        display_label: [name, p.country].filter(Boolean).join(", "),
        // GeoJSON: coordinates = [lng, lat]
        lng: f.geometry?.coordinates?.[0] ?? null,
        lat: f.geometry?.coordinates?.[1] ?? null
      };
    })
    .filter(c => c.name && c.lat != null && c.lng != null);
};

// Returneaza { [qid]: enwikiTitle } pentru lista de QID-uri Wikidata
export const fetchWikidataTitles = async (qids) => {
  if (!qids.length) return {};
  try {
    const response = await axios.get("https://www.wikidata.org/w/api.php", {
      params: {
        action: "wbgetentities",
        ids: qids.join("|"),
        props: "sitelinks",
        sitefilter: "enwiki",
        format: "json",
        origin: "*"
      },
      headers: { "User-Agent": "TripPlannerApp_Licenta/1.0 (moiseandra23@stud.ase.ro)" },
      timeout: 10000
    });
    const entities = response.data.entities || {};
    const result = {};
    for (const [qid, entity] of Object.entries(entities)) {
      const title = entity.sitelinks?.enwiki?.title;
      if (title) result[qid] = title;
    }
    return result;
  } catch (err) {
    console.error("Wikidata entity API failed:", err.message);
    return {};
  }
};

// Returneaza { [wikipediaTitle]: thumbnailUrl } pentru lista de titluri Wikipedia
export const fetchWikipediaThumbnails = async (titles) => {
  if (!titles.length) return {};
  try {
    const response = await axios.get("https://en.wikipedia.org/w/api.php", {
      params: {
        action: "query",
        titles: titles.join("|"),
        prop: "pageimages",
        format: "json",
        pithumbsize: 400,
        origin: "*"
      },
      headers: { "User-Agent": "TripPlannerApp_Licenta/1.0 (moiseandra23@stud.ase.ro)" },
      timeout: 10000
    });
    const pages = response.data.query?.pages || {};
    const result = {};
    for (const page of Object.values(pages)) {
      if (page.thumbnail?.source) result[page.title] = page.thumbnail.source;
    }
    return result;
  } catch (err) {
    console.error("Wikipedia thumbnails failed:", err.message);
    return {};
  }
};

// Traduce o localitate in romana pe baza coordonatelor, folosind numele din
// tag-urile OSM name:ro (via Nominatim accept-language=ro). Photon, sursa pentru
// autocomplete, nu suporta romana, asa ca dupa ce userul alege un oras facem un
// singur reverse-geocode aici pentru a obtine denumirea romaneasca a orasului si tarii.
// zoom=10 => nivel oras/localitate (nu strada). Daca esueaza, intoarce fallback-ul.
export const localizeCityCountryRo = async ({ lat, lng, fallbackName = null, fallbackCountry = null }) => {
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: {
        lat,
        lon: lng,
        format: "json",
        "accept-language": "ro",
        zoom: 10,
        addressdetails: 1
      },
      headers: { "User-Agent": "TripPlannerApp_Licenta/1.0 (moiseandra23@stud.ase.ro)" },
      timeout: 8000
    });

    const addr = response.data?.address ?? {};
    const name =
      addr.city || addr.town || addr.village || addr.municipality ||
      fallbackName || addr.county || null;
    const country = addr.country || fallbackCountry || null;

    return {
      name,
      country,
      display_label: [name, country].filter(Boolean).join(", ")
    };
  } catch (err) {
    console.error("Localize city (RO) failed:", err.message);
    const name = fallbackName;
    const country = fallbackCountry;
    return {
      name,
      country,
      display_label: [name, country].filter(Boolean).join(", ")
    };
  }
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
