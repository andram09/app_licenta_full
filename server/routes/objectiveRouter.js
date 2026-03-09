import express from "express"
import { objectiveController } from "../controllers/objectiveController.js";
import { authMiddleware } from "../middleware/authMiddleware.js"

export const router = express.Router();

// pt toate rutele e nevoie ca userul sa fie logat deci folosesc authMiddleware
router.use(authMiddleware)

//objectives
router.get("/trips/:id/objectives/unassigned", objectiveController.getUnassignedObjectives);
router.get("/trips/:id/objectives", objectiveController.getTripObjectives);
router.post("/trips/:id/objectives/manual", objectiveController.createObjectiveManual);
router.post("/trips/:id/objectives/from-api", objectiveController.createFromApi);

router.patch("/objectives/:id/move", objectiveController.moveObjective);
router.put("/objectives/:id", objectiveController.updateObjective);
router.delete("/objectives/:id", objectiveController.deleteObjective);