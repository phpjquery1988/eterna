import { User } from "../user/user.model"
import type { IUser } from "../../types"
import { createError } from "../../middleware/errorHandler"

export class AuthUserService {
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await User.findById(userId).select("+password")
      if (!user) {
        throw createError("User not found", 404)
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword)
      if (!isCurrentPasswordValid) {
        throw createError("Current password is incorrect", 400)
      }

      // Check if new password is different from current
      const isSamePassword = await user.comparePassword(newPassword)
      if (isSamePassword) {
        throw createError("New password must be different from current password", 400)
      }

      // Update password
      user.password = newPassword
      await user.save()
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("not found") ||
          error.message.includes("incorrect") ||
          error.message.includes("different"))
      ) {
        throw error
      }
      throw createError("Failed to change password", 500)
    }
  }

  async updateProfile(userId: string, profileData: Partial<IUser>): Promise<IUser> {
    try {
      // Remove sensitive fields that shouldn't be updated via this method
      const { password, role, isActive, isEmailVerified, ...updateData } = profileData

      const user = await User.findByIdAndUpdate(
        userId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true },
      ).select("-password")

      if (!user) {
        throw createError("User not found", 404)
      }

      return user
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error
      }
      throw createError("Failed to update profile", 500)
    }
  }

  async deactivateAccount(userId: string, password: string): Promise<void> {
    try {
      const user = await User.findById(userId).select("+password")
      if (!user) {
        throw createError("User not found", 404)
      }

      // Verify password before deactivation
      const isPasswordValid = await user.comparePassword(password)
      if (!isPasswordValid) {
        throw createError("Password is incorrect", 400)
      }

      // Deactivate account
      user.isActive = false
      await user.save()
    } catch (error) {
      if (error instanceof Error && (error.message.includes("not found") || error.message.includes("incorrect"))) {
        throw error
      }
      throw createError("Failed to deactivate account", 500)
    }
  }

  async getUserActivity(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId).select("lastLogin createdAt updatedAt")
      if (!user) {
        throw createError("User not found", 404)
      }

      return {
        lastLogin: user.lastLogin,
        accountCreated: user.createdAt,
        lastUpdated: user.updatedAt,
        accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)), // days
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error
      }
      throw createError("Failed to fetch user activity", 500)
    }
  }

  async getUserSessions(userId: string): Promise<any[]> {
    try {
      // In a real application, you would store and retrieve session information
      // This is a placeholder implementation
      const user = await User.findById(userId)
      if (!user) {
        throw createError("User not found", 404)
      }

      return [
        {
          id: "session-1",
          device: "Chrome on Windows",
          location: "New York, US",
          lastActive: user.lastLogin || new Date(),
          current: true,
          ipAddress: "192.168.1.1",
        },
      ]
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error
      }
      throw createError("Failed to fetch user sessions", 500)
    }
  }

  async requestEmailVerification(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw createError("User not found", 404)
      }

      if (user.isEmailVerified) {
        throw createError("Email is already verified", 400)
      }

      // In a real application, you would send an email verification link
      // For now, we'll just log it
      console.log(`Email verification requested for user: ${user.email}`)
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("not found") || error.message.includes("already verified"))
      ) {
        throw error
      }
      throw createError("Failed to request email verification", 500)
    }
  }
}
