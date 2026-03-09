import express from "express"
import {optimizeRouteController} from '../controllers/optimizeRouteController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

// POST /trips/:id/days/:dayId/optimize
router.post('/:id/days/:dayId/optimize', optimizeRouteController.optimizeDayRoute);
