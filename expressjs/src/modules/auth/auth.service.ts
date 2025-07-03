import jwt from "jsonwebtoken"
import { User } from "../user/user.model"
import { IdentitiesService } from "./identities.service"
import { RefreshTokenService } from "./refresh-token.service"
import { TwilioService } from "./twilio.service"
import { UserService } from "../user/user.service"
import type {
  IUser,
  IIdentity,
  IRefreshToken,
  LoginCredentials,
  RegisterData,
  OtpLoginRequest,
  OtpVerificationRequest,
  AdminOtpLoginRequest,
  AdminOtpVerificationRequest,
  LoginSuccessResponse,
  RefreshTokenResponse,
  CreateIdentityCommand,
  TokenPayload,
} from "../../types"
import { ErrorCode } from "../../libs/codes/error-codes"
import { createError } from "../../middleware/errorHandler"
import type { Request } from "express"
import * as requestIp from "request-ip"
import * as bcrypt from "bcryptjs"

export class AuthService {
  private identitiesService: IdentitiesService
  private refreshTokenService: RefreshTokenService
  private twilioService: TwilioService
  private userService: UserService

  constructor() {
    this.identitiesService = new IdentitiesService()
    this.refreshTokenService = new RefreshTokenService()
    this.twilioService = new TwilioService()
    this.userService = new UserService()
  }

  private generateToken(user: IUser, identity: IIdentity): string {
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key"
    const jwtExpire = process.env.JWT_EXPIRE || "7d"

    const payload: TokenPayload = {
      username: user.userName || user.email,
      sub: user._id,
      role: user.role,
      version: identity.version,
      provider: identity.provider,
    }
    
      return  jwt.sign({
          exp: jwtExpire,
          data: payload
                    }, 'secret');
  }

  private async generateRefreshToken(user: IUser, identity: IIdentity, request: Request): Promise<string> {
    const refreshToken = await this.refreshTokenService.create(user, identity, request)
    return refreshToken.token
  }

  private getIp(req: Request): string {
    return requestIp.getClientIp(req) || "unknown"
  }

  private getBrowserInfo(req: Request): string {
    return req.headers["user-agent"] || "unknown"
  }

  private getCountry(req: Request): string {
    return (req.headers["cf-ipcountry"] as string) || "unknown"
  }

  async register(userData: RegisterData): Promise<{ user: IUser; token: string; refreshToken: string }> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email })
      if (existingUser) {
        throw createError("User already exists with this email", 400)
      }

      // Create new user
      const user = new User(userData)
      await user.save()

      // Create identity for username/password login
      const identityCommand: CreateIdentityCommand = {
        uid: userData.userName || userData.email,
        userName: userData.userName || userData.email,
        provider: "username",
        secret: user.password,
        expirationDate: new Date("2099-12-31"),
        version: 1,
        user: user._id,
      }

      await this.identitiesService.baseCreate(identityCommand)

      // Generate tokens
      const identity = await this.identitiesService.getValid(user._id, "username")
      if (!identity) {
        throw createError("Identity not found", 500)
      }
      const token = this.generateToken(user, identity)
      const refreshToken = await this.generateRefreshToken(user, identity, {} as Request)

      // Remove password from response
      const userResponse = await User.findById(user._id).select("-password")

      return {
        user: userResponse as IUser,
        token,
        refreshToken,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        throw error
      }
      throw createError("Failed to register user", 500)
    }
  }

  async login(credentials: LoginCredentials, request: Request): Promise<LoginSuccessResponse> {
    try {
      let user: IUser

      if (credentials.userName && credentials.password) {
        user = await this.userService.login(credentials.userName, credentials.password, request)
      } else if (credentials.email && credentials.password) {
        // Find user by email and validate password
        const foundUser = await User.findOne({ email: credentials.email, isActive: true }).select("+password")
        if (!foundUser || !(await foundUser.comparePassword(credentials.password))) {
          throw createError("Invalid email or password", 401)
        }
        user = foundUser
      } else {
        throw createError("Username/email and password are required", 400)
      }

      return await this.getLoginSuccessResponse(user, request, "username")
    } catch (error) {
      if (error instanceof Error && error.message.includes("Invalid")) {
        throw error
      }
      throw createError("Failed to login", 500)
    }
  }

  async getLoginSuccessResponse(
    user: IUser,
    request: Request,
    provider: "username" | "phone" | "email" | "google" | "facebook",
  ): Promise<LoginSuccessResponse> {
    try {
      // Get or create identity
      let identity = await this.identitiesService.getValid(user._id, provider)

      if (!identity) {
        // Create identity if it doesn't exist
        const identityCommand: CreateIdentityCommand = {
          uid: user.userName || user.email,
          userName: user.userName || user.email,
          provider,
          secret: user.password,
          expirationDate: new Date("2099-12-31"),
          version: 1,
          user: user._id,
        }
        identity = await this.identitiesService.baseCreate(identityCommand)
      }

      const token = this.generateToken(user, identity)
      const refreshToken = await this.generateRefreshToken(user, identity, request)

      // Update identity with new tokens
      await this.identitiesService.updateTokens(identity._id, token, refreshToken)

      // Remove password from user object
      const userResponse = await User.findById(user._id).select("-password")

      return {
        user: userResponse as any,
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE || "7d",
      }
    } catch (error) {
      throw createError("Failed to generate login response", 500)
    }
  }

  async getRefreshTokenSuccessResponse(
    user: IUser,
    identity: IIdentity,
    request: Request,
  ): Promise<RefreshTokenResponse> {
    try {
      const token = this.generateToken(user, identity)
      const refreshToken = await this.generateRefreshToken(user, identity, request)

      // Update identity with new tokens
      await this.identitiesService.updateTokens(identity._id, token, refreshToken)

      return {
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE || "7d",
      }
    } catch (error) {
      throw createError("Failed to generate refresh token response", 500)
    }
  }

  async sendLoginOtp(request: Request, body: OtpLoginRequest): Promise<{ message: string; phone: string }> {
    try {
      const { phoneNumber } = body
      console.log("[Send Otp] PhoneNumber", phoneNumber)

      // Check if user exists with this phone number
      const user = await this.userService.getUserByPhone(phoneNumber)
      if (!user) {
        console.error("[Send Otp] User Not Found")
        throw createError(ErrorCode.USER_PHONE_NOT_FOUND, 404)
      }

      const userId = user._id
      const identity = await this.identitiesService.getByUserId(userId, "username")

      if (!identity) {
        const password = await bcrypt.hash(user.firstName || "default", 10)
        await this.identitiesService.createIdentity(user, password)
      }

      // Use Twilio service for SMS
      const result = await this.twilioService.sendOTP(phoneNumber)
      console.log("[Send Otp] OTP Sent on", phoneNumber)

      return result
    } catch (error) {
      if (error instanceof Error && error.message.includes("No user found")) {
        throw error
      }
      throw createError("Failed to send OTP", 500)
    }
  }

  async verifyOtpLogin(request: Request, body: OtpVerificationRequest): Promise<LoginSuccessResponse> {
    try {
      const { phoneNumber, otp } = body
      console.log("[Verify Otp] PhoneNumber", phoneNumber)

      // Verify OTP using Twilio
      const isVerified = await this.twilioService.validateOTP(phoneNumber, otp)
      console.log("[Verify Otp] Number verification Status", isVerified)

      if (!isVerified) {
        console.log("[Verify Otp] Invalid Otp")
        throw createError("Invalid OTP", 400)
      }

      // Get user by phone number
      const user = await this.userService.getUserByPhone(phoneNumber)
      console.log("[Verify Otp] user", user)

      if (!user) {
        console.log("[Verify Otp] user not found")
        throw createError("User not found", 404)
      }

      const userId = user._id
      const identity = await this.identitiesService.getByUserId(userId, "username")
      console.log("[Verify Otp] identity", identity)

      if (!identity) {
        throw createError("Identity not found", 404)
      }

      const token = this.generateToken(user, identity)
      const refreshToken = await this.generateRefreshToken(user, identity, request)

      // Update identity with new tokens
      await this.identitiesService.updateTokens(identity._id, token, refreshToken)

      // Remove password from user object
      const userResponse = await User.findById(user._id).select("-password")

      return {
        user: userResponse as any,
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE || "7d",
      }
    } catch (error) {
      if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("User not found"))) {
        throw error
      }
      throw createError("Failed to verify OTP login", 500)
    }
  }

  async sendLoginOtpToAdminOfOtherUser(
    request: Request,
    body: AdminOtpLoginRequest,
  ): Promise<{ message: string; phone: string }> {
    try {
      const { phoneNumber, npn } = body
      console.log("[Send Otp] PhoneNumber", phoneNumber)

      const [admin, user] = await Promise.all([
        this.userService.getAdminUserByPhone(phoneNumber),
        this.userService.findByNpn(npn),
      ])

      if (!admin) {
        throw createError("No admin user found with this phone number", 404)
      }

      if (!user) {
        throw createError("Invalid NPN provided", 404)
      }

      const userId = user._id
      const identity = await this.identitiesService.getByUserId(userId, "username")

      if (!identity) {
        const password = await bcrypt.hash(user.firstName || "default", 10)
        await this.identitiesService.createIdentity(user, password)
      }

      // Use Twilio service for SMS
      const result = await this.twilioService.sendOTP(phoneNumber)

      return result
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error
      }
      throw createError("Failed to send admin OTP", 500)
    }
  }

  async verifyOtpLoginToAdminOfOtherUser(
    request: Request,
    body: AdminOtpVerificationRequest,
  ): Promise<LoginSuccessResponse> {
    try {
      const { phoneNumber, otp, npn } = body

      // Verify OTP using Twilio
      const isVerified = await this.twilioService.validateOTP(phoneNumber, otp)

      if (!isVerified) {
        throw createError("Invalid OTP", 400)
      }

      const [user, admin] = await Promise.all([
        this.userService.findByNpn(npn),
        this.userService.getAdminUserByPhone(phoneNumber),
      ])

      if (!user) {
        throw createError("User not found", 404)
      }

      if (!admin) {
        throw createError("Admin not found", 404)
      }

      const userId = user._id
      const identity = await this.identitiesService.getByUserId(userId, "username")

      if (!identity) {
        throw createError("Identity not found", 404)
      }

      const token = this.generateToken(user, identity)
      const refreshToken = await this.generateRefreshToken(user, identity, request)

      // Update identity with new tokens
      await this.identitiesService.updateTokens(identity._id, token, refreshToken)

      // Remove password from user object
      const userResponse = await User.findById(user._id).select("-password")

      return {
        user: userResponse as any,
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE || "7d",
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error
      }
      throw createError("Failed to verify admin OTP login", 500)
    }
  }

  async updatePhoneNumberAndSendOtp(
    userName: string,
    phoneNumber: string,
  ): Promise<{ message: string; phone: string }> {
    try {
      // Update user's phone number
      const user = await this.userService.updatePhoneNumber(userName, phoneNumber)
      if (!user) {
        throw createError("User not found", 404)
      }

      // Use Twilio service for SMS
      const result = await this.twilioService.sendOTP(phoneNumber)

      return result
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error
      }
      throw createError("Failed to update phone number", 500)
    }
  }

  async validateRefreshToken(request: Request, refreshToken: string): Promise<{ user: IUser; identity: IIdentity }> {
    try {
      if (!refreshToken) {
        throw createError("Refresh token missing", 401)
      }

      const tokenRecord = await this.refreshTokenService.findByToken(refreshToken)

      if (!tokenRecord) {
        throw createError("Invalid or expired refresh token", 401)
      }

      // Verify browser info matches
      const currentBrowser = this.getBrowserInfo(request)
      if (tokenRecord.browser !== currentBrowser) {
        throw createError("Invalid refresh token", 401)
      }

      const user = tokenRecord.user as IUser
      const identity = tokenRecord.identity as IIdentity

      if (!user || !user.isActive) {
        throw createError("User not found or inactive", 404)
      }

      // Verify user is allowed to login
      this.userService.verifyIsAllowedToLogin(user)

      return { user, identity }
    } catch (error) {
      if (error instanceof Error && (error.message.includes("Invalid") || error.message.includes("not found"))) {
        throw error
      }
      throw createError("Failed to validate refresh token", 500)
    }
  }

  async verifyToken(token: string): Promise<IUser> {
    try {
      const jwtSecret = process.env.JWT_SECRET || "your-secret-key"
      const decoded = jwt.verify(token, jwtSecret) as TokenPayload

      const user = await User.findById(decoded.sub).select("-password")
      if (!user || !user.isActive) {
        throw createError("Invalid token or user inactive", 401)
      }

      const identity = await this.identitiesService.getValid(user._id, decoded.provider)
      if (!identity || identity.version !== decoded.version) {
        throw createError("Invalid token version", 401)
      }

      return user
    } catch (error) {
      throw createError("Invalid or expired token", 401)
    }
  }

  // Additional methods for session management
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    try {
      await this.refreshTokenService.revokeToken(refreshToken)
    } catch (error) {
      throw createError("Failed to revoke refresh token", 500)
    }
  }

  async getUserActiveSessions(userId: string): Promise<IRefreshToken[]> {
    try {
      return await this.refreshTokenService.getUserActiveTokens(userId)
    } catch (error) {
      throw createError("Failed to get user active sessions", 500)
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    try {
      await this.refreshTokenService.revokeAllUserTokens(userId)
    } catch (error) {
      throw createError("Failed to revoke all user sessions", 500)
    }
  }
}
