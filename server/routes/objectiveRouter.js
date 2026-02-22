import express from "express"
import { objectiveController } from "../controllers/objectiveController.js";
import { authMiddleware } from "../middleware/authMiddleware.js"

export const router=express.Router();

// pt toate rutele e nevoie ca userul sa fie logat deci folosesc authMiddleware
router.use(authMiddleware)

router.get("/trip/:tripId/unassigned", objectiveController.getUnassignedObjectives);
router.post("/:tripId", objectiveController.createObjective);
router.patch("/:id/move", objectiveController.moveObjective);
router.put("/:id", objectiveController.updateObjective);
router.delete("/:id", objectiveController.deleteObjective);