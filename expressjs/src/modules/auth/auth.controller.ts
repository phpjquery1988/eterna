import type { Request, Response } from "express"
import { AuthService } from "./auth.service"
import type {
  AuthRequest,
  ApiResponse,
  LoginCredentials,
  RegisterData,
  OtpLoginRequest,
  OtpVerificationRequest,
  AdminOtpLoginRequest,
  AdminOtpVerificationRequest,
  UpdatePhoneRequest,
} from "../../types"
import { asyncHandler } from "../../middleware/errorHandler"
import {
  CreateRefreshTokenCommand,
  ErrorCode,
  IdentityProviderEnum,
  UserDto,
} from '../../libs/index';
export class AuthController {
  private authService: AuthService

  constructor() {
    this.authService = new AuthService()
  }

  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userData: RegisterData = req.body
    const { user, token, refreshToken } = await this.authService.register(userData)

    const response: ApiResponse = {
      success: true,
      message: "User registered successfully",
      data: {
        user,
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE || "7d",
      },
      timestamp: new Date().toISOString(),
    }

    res.status(201).json(response)
  })

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const credentials: LoginCredentials = req.body
    const loginResponse = await this.authService.login(credentials, req)

    const response: ApiResponse = {
      success: true,
      message: "Login successful",
      data: loginResponse,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  loginViaOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body: OtpLoginRequest = req.body
    const result = await this.authService.sendLoginOtp(req, body)
    if(!result)
    {
        res.status(200).json({
          code:ErrorCode.USER_NOT_FOUND,
          message:null
        })
    }
    else 
    {
      const response: ApiResponse = {
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      }

      res.status(200).json(response)
    }
  })

  verifyOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body: OtpVerificationRequest = req.body
    const loginResponse = await this.authService.verifyOtpLogin(req, body)

    const response: ApiResponse = {
      success: true,
      message: "OTP verified successfully",
      data: loginResponse,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  sendLoginOtpToAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body: AdminOtpLoginRequest = req.body
    const result = await this.authService.sendLoginOtpToAdminOfOtherUser(req, body)

    const response: ApiResponse = {
      success: true,
      message: result.message,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  verifyLoginOtpToAdmin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body: AdminOtpVerificationRequest = req.body
    const loginResponse = await this.authService.verifyOtpLoginToAdminOfOtherUser(req, body)

    const response: ApiResponse = {
      success: true,
      message: "Admin OTP verified successfully",
      data: loginResponse,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  updatePhone = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body: UpdatePhoneRequest = req.body
    const result = await this.authService.updatePhoneNumberAndSendOtp(body.userName, body.phoneNumber)

    const response: ApiResponse = {
      success: true,
      message: result.message,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = (req.headers["x-auth-refresh-token"] as string) || req.body.refreshToken

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
        timestamp: new Date().toISOString(),
      })
      return
    }

    const validateResponse = await this.authService.validateRefreshToken(req, refreshToken)
    const tokenResponse = await this.authService.getRefreshTokenSuccessResponse(
      validateResponse.user,
      validateResponse.identity,
      req
    )

    const response: ApiResponse = {
      success: true,
      message: "Token refreshed successfully",
      data: tokenResponse,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  verifyToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body

    if (!token) {
      res.status(400).json({
        success: false,
        message: "Token is required",
        timestamp: new Date().toISOString(),
      })
      return
    }

    const user = await this.authService.verifyToken(token)

    const response: ApiResponse = {
      success: true,
      message: "Token is valid",
      data: { user, valid: true },
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  logout = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return a success response
    const response: ApiResponse = {
      success: true,
      message: "Logout successful",
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })
}
