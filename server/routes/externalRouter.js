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

