import express from "express"
import { tripController } from "../controllers/tripController.js"
import { authMiddleware } from "../middleware/authMiddleware.js"

export const router=express.Router();

// pt toate rutele e nevoie ca userul sa fie logat deci folosesc authMiddleware
router.use(authMiddleware)

router.get("/", tripController.getAllTrips)
router.get("/:id", tripController.getTripById)
router.post("/", tripController.createTrip)
router.put("/:id", tripController.updateTripStartDate)
router.delete("/:id", tripController.deleteTrip)
router.put("/:id/duration", tripController.updateTripDuration)
