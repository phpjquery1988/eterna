import type { Response } from "express"
import { AuthUserService } from "./auth-user.service"
import type { AuthRequest, ApiResponse } from "../../types"
import { asyncHandler } from "../../middleware/errorHandler"

export class AuthUserController {
  private authUserService: AuthUserService

  constructor() {
    this.authUserService = new AuthUserService()
  }

  changePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        timestamp: new Date().toISOString(),
      })
      return
    }

    const { currentPassword, newPassword } = req.body

    await this.authUserService.changePassword(req.user._id, currentPassword, newPassword)

    const response: ApiResponse = {
      success: true,
      message: "Password changed successfully",
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  updateProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        timestamp: new Date().toISOString(),
      })
      return
    }

    const profileData = req.body
    const user = await this.authUserService.updateProfile(req.user._id, profileData)

    const response: ApiResponse = {
      success: true,
      message: "Profile updated successfully",
      data: user,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  deactivateAccount = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        timestamp: new Date().toISOString(),
      })
      return
    }

    const { password } = req.body
    await this.authUserService.deactivateAccount(req.user._id, password)

    const response: ApiResponse = {
      success: true,
      message: "Account deactivated successfully",
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  getUserActivity = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        timestamp: new Date().toISOString(),
      })
      return
    }

    const activity = await this.authUserService.getUserActivity(req.user._id)

    const response: ApiResponse = {
      success: true,
      message: "User activity fetched successfully",
      data: activity,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  getUserSessions = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        timestamp: new Date().toISOString(),
      })
      return
    }

    const sessions = await this.authUserService.getUserSessions(req.user._id)

    const response: ApiResponse = {
      success: true,
      message: "User sessions fetched successfully",
      data: sessions,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  requestEmailVerification = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
        timestamp: new Date().toISOString(),
      })
      return
    }

    await this.authUserService.requestEmailVerification(req.user._id)

    const response: ApiResponse = {
      success: true,
      message: "Email verification requested successfully",
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })
}
