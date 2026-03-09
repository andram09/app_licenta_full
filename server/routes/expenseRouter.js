import express from "express";
import { expenseController } from "../controllers/expenseController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const router = express.Router();

router.use(authMiddleware);

router.post("/trips/:tripId/expenses", expenseController.createExpense);
router.get("/trips/:tripId/expenses", expenseController.getTripExpenses);
router.get("/trips/:tripId/budget-summary", expenseController.getBudgetSummary);
router.delete("/expenses/:id", expenseController.deleteExpense);

router.patch("/trips/:tripId/people", expenseController.updateTripPeople);
router.patch("/trips/:tripId/objectives/:objectiveId/cost", expenseController.updateObjectiveCost);
router.post("/trips/:tripId/budget/estimate-ai", expenseController.estimateCostsWithAI);
router.put("/expenses/:id", expenseController.updateExpense);
router.get("/expense-categories", expenseController.getCategories);