import express from "express"
import { externalController } from "../controllers/externalController.js"
import { authMiddleware } from "../middleware/authMiddleware.js"

export const router=express.Router();

router.use(authMiddleware);

// /external/cultural?lat=...&lng=...
router.get("/cultural", externalController.getCulturalPlaces);

// /external/lifestyle?lat=...&lng=...&category=restaurant|cafe|bar|nightlife
router.get("/lifestyle", externalController.getLifestylePlaces);



