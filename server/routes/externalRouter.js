import express from "express"
import { externalController } from "../controllers/externalController.js"
import { authMiddleware } from "../middleware/authMiddleware.js"

export const router = express.Router();

// /external/places?lat=...&lng=...&category=...
router.get("/places", externalController.getPlacesByCategory);

// /external/search?name=...&lat=...&lng=...&radius=...
router.get("/search", externalController.searchPlacesByName);

// /external/cities?query=...
router.get("/cities", externalController.getCities);

// /external/localize-city?lat=...&lng=...&name=...&country=...
router.get("/localize-city", externalController.localizeCity);

// /external/reverse-geocode
router.post("/reverse-geocode", authMiddleware, externalController.reverseGeocode);

