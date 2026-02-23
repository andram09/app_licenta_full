import express from "express";
import { adminController } from "../controllers/adminController.js";
import { authMiddleware, adminMiddleware } from "../middleware/authMiddleware.js";

export const router = express.Router();

router.get("/dashboard", authMiddleware, adminMiddleware, adminController.getDashboardStats);
