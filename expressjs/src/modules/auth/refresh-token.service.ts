import { RefreshToken } from "./refresh-token.model"
import type { IRefreshToken, IUser, IIdentity } from "../../types"
import { createError } from "../../middleware/errorHandler"
import type { Request } from "express"
import * as crypto from "crypto"
import * as requestIp from "request-ip"

export class RefreshTokenService {
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 30

  async create(user: IUser, identity: IIdentity, request: Request): Promise<IRefreshToken> {
    try {
      // Generate secure random token
      const token = crypto.randomBytes(64).toString("hex")

      // Get client information
      const ip = requestIp.getClientIp(request) || "unknown"
      const userAgent = request.headers["user-agent"] || "unknown"
      const browser = this.extractBrowser(userAgent)
      const country = "Unknown" // You can integrate with IP geolocation service

      // Set expiration date
      const expires = new Date()
      expires.setDate(expires.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS)

      const refreshTokenData = {
        token,
        isRevoked: false,
        expires,
        ip,
        browser,
        country,
        user: user._id,
        identity: identity._id,
      }

      const refreshToken = new RefreshToken(refreshTokenData)
      return await refreshToken.save()
    } catch (error) {
      throw createError("Failed to create refresh token", 500)
    }
  }

  async findByToken(token: string): Promise<IRefreshToken | null> {
    try {
      return await RefreshToken.findOne({
        token,
        isRevoked: false,
        isActive: true,
        expires: { $gt: new Date() },
      })
        .populate("user", "firstName lastName userName email role")
        .populate("identity", "uid provider version")
    } catch (error) {
      throw createError("Failed to find refresh token", 500)
    }
  }

  async revokeToken(token: string): Promise<void> {
    try {
      await RefreshToken.findOneAndUpdate({ token }, { isRevoked: true })
    } catch (error) {
      throw createError("Failed to revoke refresh token", 500)
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await RefreshToken.updateMany({ user: userId, isRevoked: false }, { isRevoked: true })
    } catch (error) {
      throw createError("Failed to revoke user tokens", 500)
    }
  }

  async revokeAllIdentityTokens(identityId: string): Promise<void> {
    try {
      await RefreshToken.updateMany({ identity: identityId, isRevoked: false }, { isRevoked: true })
    } catch (error) {
      throw createError("Failed to revoke identity tokens", 500)
    }
  }

  async getUserActiveTokens(userId: string): Promise<IRefreshToken[]> {
    try {
      return await RefreshToken.find({
        user: userId,
        isRevoked: false,
        isActive: true,
        expires: { $gt: new Date() },
      })
        .populate("identity", "provider")
        .sort({ createdAt: -1 })
    } catch (error) {
      throw createError("Failed to get user active tokens", 500)
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    try {
      await RefreshToken.deleteMany({
        $or: [{ expires: { $lt: new Date() } }, { isRevoked: true }],
      })
    } catch (error) {
      console.error("Failed to cleanup expired tokens:", error)
    }
  }

  private extractBrowser(userAgent: string): string {
    if (userAgent.includes("Chrome")) return "Chrome"
    if (userAgent.includes("Firefox")) return "Firefox"
    if (userAgent.includes("Safari")) return "Safari"
    if (userAgent.includes("Edge")) return "Edge"
    if (userAgent.includes("Opera")) return "Opera"
    return "Unknown"
  }
}
