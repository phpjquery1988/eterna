import { Router } from "express"
import { UserController } from "./user.controller"
import { authenticateToken, requireRole } from "../../middleware/auth"
import { registerValidation, updateUserValidation, updatePasswordValidation } from "../../middleware/validation"

const router = Router()
const userController = new UserController()

// Protected routes - require authentication
router.use(authenticateToken)

// Get current user
router.get("/me", userController.getCurrentUser)
// Admin only routes
router.post("/", requireRole(["admin"]), registerValidation, userController.create)
router.get("/", requireRole(["admin"]), userController.getAllUsers)
router.get("/stats", requireRole(["admin"]), userController.getUserStats)
router.get("/login-records", requireRole(["admin"]), userController.getLoginRecords)
router.get("/weekly-device-summary", requireRole(["admin"]), userController.getWeeklyDeviceSummary)
router.get("/weekly-country-summary", requireRole(["admin"]), userController.getWeeklyCountrySummary)
router.get("/:id", requireRole(["admin"]), userController.getUserById)
router.put("/:id", requireRole(["admin"]), updateUserValidation, userController.update)
router.patch("/:id/password", requireRole(["admin"]), updatePasswordValidation, userController.updatePassword)
router.put("/:id/avatar", requireRole(["admin"]), ...userController.uploadAvatar)
router.delete("/:id", requireRole(["admin"]), userController.delete)

export default router
