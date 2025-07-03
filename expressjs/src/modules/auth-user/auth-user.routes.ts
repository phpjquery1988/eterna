import { Router } from "express"
import { AuthUserController } from "./auth-user.controller"
import { authenticateToken } from "../../middleware/auth"
import { changePasswordValidation } from "../../middleware/validation"

const router = Router()
const authUserController = new AuthUserController()

// All routes require authentication
router.use(authenticateToken)

router.put("/change-password", changePasswordValidation, authUserController.changePassword)
router.put("/profile", authUserController.updateProfile)
router.post("/deactivate", authUserController.deactivateAccount)
router.get("/activity", authUserController.getUserActivity)
router.get("/sessions", authUserController.getUserSessions)
router.post("/verify-email", authUserController.requestEmailVerification)

export default router
