import { Router } from "express"
import { AuthController } from "./auth.controller"
import { authenticateToken } from "../../middleware/auth"
import { registerValidation, loginValidation, otpValidation, phoneUpdateValidation } from "../../middleware/validation"

const router = Router()
const authController = new AuthController()

// Public routes
router.post("/register", registerValidation, authController.register)
router.post("/login", loginValidation, authController.login)
router.post("/loginviaotp", otpValidation, authController.loginViaOtp)
router.post("/verification/otp", authController.verifyOtp)
router.post("/sendloginotp/admin", authController.sendLoginOtpToAdmin)
router.post("/verification/otp/admin", authController.verifyLoginOtpToAdmin)
router.post("/update/phone", phoneUpdateValidation, authController.updatePhone)
router.post("/refresh", authController.refreshToken)
router.post("/verify", authController.verifyToken)

// Protected routes
router.post("/logout", authenticateToken, authController.logout)

export default router
