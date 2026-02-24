import express from "express"
import { tripController } from "../controllers/tripController.js"
import { authMiddleware } from "../middleware/authMiddleware.js"
import { objectiveController } from "../controllers/objectiveController.js";

export const router=express.Router();

// pt toate rutele e nevoie ca userul sa fie logat deci folosesc authMiddleware
router.use(authMiddleware)

router.get("/", tripController.getAllTrips)
router.get("/:id", tripController.getTripById)
router.post("/", tripController.createTrip)
router.put("/:id", tripController.updateTripStartDate)
router.delete("/:id", tripController.deleteTrip)
router.put("/:id/duration", tripController.updateTripDuration)

// //objectives
// router.get("/:tripId/objectives/unassigned", objectiveController.getUnassignedObjectives);
// router.post("/:tripId/objectives/manual", objectiveController.createObjectiveManual);
// router.post("/:tripId/objectives/from-api", objectiveController.createFromApi);
