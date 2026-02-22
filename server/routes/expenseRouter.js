import express from "express";
import { expenseController } from "../controllers/expenseController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const router = express.Router();

router.use(authMiddleware);

router.post("/trips/:tripId/expenses", expenseController.createExpense);
router.get("/trips/:tripId/expenses", expenseController.getTripExpenses);
router.get("/trips/:tripId/budget-summary", expenseController.getBudgetSummary);
router.delete("/expenses/:id", expenseController.deleteExpense);