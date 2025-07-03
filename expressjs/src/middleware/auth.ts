import type { Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { User } from "../modules/user/user.model"
import type { AuthRequest } from "../types"

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token required",
        timestamp: new Date().toISOString(),
      })
      return
    }

    const jwtSecret = process.env.JWT_SECRET || "your-secret-key"
    const decoded = jwt.verify(token, jwtSecret) as { userId: string }

    const user = await User.findById(decoded.userId).select("-password")
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Invalid token or user inactive",
        timestamp: new Date().toISOString(),
      })
      return
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    req.user = user
    next()
  } catch (error) {
    res.status(403).json({
      success: false,
      message: "Invalid or expired token",
      timestamp: new Date().toISOString(),
    })
  }
}

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        timestamp: new Date().toISOString(),
      })
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        timestamp: new Date().toISOString(),
      })
      return
    }

    next()
  }
}
