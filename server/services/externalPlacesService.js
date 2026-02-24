import axios from "axios";

const OPENTRIPMAP_API_KEY = process.env.OPENTRIPMAP_API_KEY;

if (!OPENTRIPMAP_API_KEY) {
  console.warn("Missing OPENTRIPMAP_API_KEY in .env");
}

// normalize pentru modelul Objective
const normalizeObjective = ({
  id,
  title,
  description,
  lat,
  lng,
  address,
  provider
}) => ({
  title,
  description: description || null,
  coord_lat: lat,
  coord_lng: lng,
  address: address || null,
  source_type: "API",
  external_place_id: id,
  external_provider: provider
});

export const fetchOpenTripMapByKinds = async (lat, lng, kinds, radius = 5000) => {
  const response = await axios.get(
    "https://api.opentripmap.com/0.1/en/places/radius",
    {
      params: {
        radius,
        lon: lng,
        lat,
        kinds,
        format: "json",
        limit: 20,
        apikey: OPENTRIPMAP_API_KEY
      }
    }
  );

  return response.data
    .filter(place => place.name && place.name.trim().length > 0)
    .map(place =>
      normalizeObjective({
        id: place.xid,
        title: place.name,
        description: null,
        lat: place.point.lat,
        lng: place.point.lon,
        provider: "OPENTRIPMAP"
      })
    );
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