import express from "express"

import { controllers } from "../controllers/index.js"
import { validate } from "../middleware/validationMiddleware.js"
import { authLimiter } from "../middleware/rateLimiter.js"
import { authMiddleware } from "../middleware/authMiddleware.js"

import {registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, updateProfileSchema, changePasswordSchema} from "../validations/authValidation.js"

export const router=express.Router()

router.post("/register", authLimiter, validate(registerSchema), controllers.authController.register)
router.post("/login", authLimiter, validate(loginSchema), controllers.authController.login)
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), controllers.authController.forgotPassword)
router.post("/reset-password", validate(resetPasswordSchema), controllers.authController.resetPassword)
router.get("/profile", authMiddleware, controllers.authController.getMe)
router.post("/logout", controllers.authController.logout)
router.post("/profile", authMiddleware, validate(updateProfileSchema), controllers.authController.updateProfile)
router.post("/profile/password", authMiddleware, validate(changePasswordSchema), controllers.authController.changePassword)
