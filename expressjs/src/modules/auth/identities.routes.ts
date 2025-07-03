import { Router } from "express"
import { IdentitiesController } from "./identities.controller"
import { authenticateToken, requireRole } from "../../middleware/auth"

const router = Router()
const identitiesController = new IdentitiesController()

// Admin only routes
router.use(authenticateToken)
router.use(requireRole(["admin"]))

router.get("/", identitiesController.get)

export default router
