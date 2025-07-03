import { Router, type Request, type Response } from "express"

const router = Router()

router.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
  })
})

export default router
