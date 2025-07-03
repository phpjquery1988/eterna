import { User } from "./user.model"
import  LoginRecordsService  from "./login-records.service"
import type {
  IUser,
  PaginatedResponse,
  CreateUserCommand,
  UpdateUserDataCommand,
  UpdateUserPasswordCommand,
  GetUsersQuery,
} from "../../types"
import { createError } from "../../middleware/errorHandler"
import type { Request } from "express"
import * as bcrypt from "bcryptjs"
import * as fs from "fs/promises"
import * as path from "path"
import type { Types } from "mongoose"

export class UserService {
  private loginRecordsService: LoginRecordsService
  private authConfig = {
    loginAttempts: 5,
    userBlockTime: 30 * 60 * 1000, // 30 minutes
  }

  constructor() {
    this.loginRecordsService = new LoginRecordsService()
  }

  async get(query: GetUsersQuery): Promise<PaginatedResponse<IUser>> {
    try {
      const page = Math.max(1, query.page || 1)
      const limit = Math.min(50, Math.max(1, query.limit || 10))
      const skip = (page - 1) * limit

      // Build search filter
      const filter: any = { isActive: true }

      if (query.userName) {
        filter.userName = query.userName
      }

      if (query.role) {
        filter.role = query.role
      }

      if (query.searchQuery) {
        filter.$text = { $search: query.searchQuery }
      }

      if (query.search) {
        filter.$or = [
          { firstName: { $regex: query.search, $options: "i" } },
          { lastName: { $regex: query.search, $options: "i" } },
          { userName: { $regex: query.search, $options: "i" } },
          { email: { $regex: query.search, $options: "i" } },
        ]
      }

      // Build sort
      const sortOptions: any = {}
      if (query.sort) {
        const [field, order] = query.sort.split(":")
        sortOptions[field] = order === "desc" ? -1 : 1
      } else {
        sortOptions.createdAt = -1
      }

      const [users, totalItems] = await Promise.all([
        User.find(filter)
          .populate("creator", "firstName lastName userName")
          .select("-password")
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter),
      ])

      const totalPages = Math.ceil(totalItems / limit)

      return {
        data: users as IUser[],
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      throw createError("Failed to fetch users", 500)
    }
  }

  async getUserById(userId: string): Promise<IUser> {
    try {
      const user = await User.findById(userId).populate("creator", "firstName lastName userName").select("-password")

      if (!user) {
        throw createError("User not found", 404)
      }
      return user
    } catch (error) {
      if (error instanceof Error && error.message === "User not found") {
        throw error
      }
      throw createError("Failed to fetch user", 500)
    }
  }

  async create(command: CreateUserCommand): Promise<IUser> {
    try {
      // Check if username already exists
      if (command.userName) {
        await this.expectUserNameNotExists(command.userName)
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email: command.email })
      if (existingUser) {
        throw createError("User already exists with this email", 400)
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(command.password, 12)

      // Create user
      const userData = {
        ...command,
        password: hashedPassword,
        role: command.role || "regular",
      }

      const user = new User(userData)
      await user.save()

      // Remove password from response
      const userResponse = await User.findById(user._id).select("-password")
      return userResponse as IUser
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        throw error
      }
      throw createError("Failed to create user", 500)
    }
  }

  async updateBasicData(userId: string, userData: UpdateUserDataCommand): Promise<IUser> {
    try {
      const user = await User.findByIdAndUpdate(userId, { $set: userData }, { new: true, runValidators: true }).select(
        "-password",
      )

      if (!user) {
        throw createError("User not found", 404)
      }

      return user
    } catch (error) {
      if (error instanceof Error && error.message === "User not found") {
        throw error
      }
      throw createError("Failed to update user", 500)
    }
  }

  async updatePassword(userId: string, command: UpdateUserPasswordCommand): Promise<IUser> {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw createError("User not found", 404)
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(command.password, 12)

      // Update password
      user.password = hashedPassword
      await user.save()

      // If logOutEverywhere is true, you might want to invalidate all tokens
      // This would require a token blacklist or changing user's token version

      return (await User.findById(userId).select("-password")) as IUser
    } catch (error) {
      if (error instanceof Error && error.message === "User not found") {
        throw error
      }
      throw createError("Failed to update password", 500)
    }
  }

  async deleteUser(userId: string): Promise<IUser> {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw createError("User not found", 404)
      }

      // Delete user
      await User.findByIdAndDelete(userId)

      // Try to delete avatar file
      try {
        const uploadsDir = process.env.UPLOADS_DIR || "./uploads"
        const avatarPath = path.join(uploadsDir, "avatars", `${userId}.webp`)
        await fs.unlink(avatarPath)
      } catch (error) {
        // Ignore file deletion errors
        console.warn("Could not delete avatar file:", error)
      }

      return user
    } catch (error) {
      if (error instanceof Error && error.message === "User not found") {
        throw error
      }
      throw createError("Failed to delete user", 500)
    }
  }

  async login(userName: string, password: string, request: Request): Promise<IUser> {
    try {
      const user = await this.validateCredentialsGetUser(userName, password)

      try {
        await this.runPostLogin(user, true, request)
        return user
      } catch (error) {
        await this.runPostLogin(user, false, request)
        throw error
      }
    } catch (error) {
      throw error
    }
  }

  async updateAvatar(userId: string, avatarPath: string): Promise<IUser> {
    try {
      const user = await User.findByIdAndUpdate(userId, { avatar: avatarPath }, { new: true }).select("-password")

      if (!user) {
        throw createError("User not found", 404)
      }

      return user
    } catch (error) {
      throw createError("Failed to update avatar", 500)
    }
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email, isActive: true }).select("+password")
    } catch (error) {
      throw createError("Failed to fetch user by email", 500)
    }
  }

  async getUserByPhone(phone: string): Promise<IUser | null> {
    try {
      return await User.findOne({
        $or: [{ phone }, { otherPhones: phone }],
        isActive: true,
      })
    } catch (error) {
      throw createError("Failed to fetch user by phone", 500)
    }
  }

  async getAdminUserByPhone(phone: string): Promise<IUser | null> {
    try {
      return await User.findOne({
        $or: [{ phone }, { otherPhones: phone }],
        role: "admin",
        isActive: true,
      })
    } catch (error) {
      throw createError("Failed to fetch admin user by phone", 500)
    }
  }

  async findByNpn(npn: string): Promise<IUser | null> {
    try {
      return await User.findOne({ userName: npn, isActive: true })
    } catch (error) {
      throw createError("Failed to fetch user by NPN", 500)
    }
  }

  async updateByUsername(npn: string, data: any): Promise<IUser | null> {
    try {
      return await User.findOneAndUpdate({ userName: npn }, { $set: data }, { new: true }).select("-password")
    } catch (error) {
      throw createError("Failed to update user by username", 500)
    }
  }

  async updatePhoneNumber(userName: string, phoneNumber: string): Promise<IUser | null> {
    try {
      const user = await User.findOneAndUpdate({ userName }, { phone: phoneNumber }, { new: true }).select("-password")

      if (!user) {
        throw createError("User not found", 404)
      }

      return user
    } catch (error) {
      throw createError("Failed to update phone number", 500)
    }
  }

  async getRegisteredTodayCount(): Promise<number> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return await User.countDocuments({
        createdAt: { $gte: today },
        role: "regular",
      })
    } catch (error) {
      console.error("Error getting registered today count:", error)
      return 0
    }
  }

  async getInactiveUsersCount(): Promise<number> {
    try {
      const threshold = new Date()
      threshold.setTime(threshold.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago

      return await User.countDocuments({
        $or: [{ lastLogin: { $exists: false } }, { lastLogin: { $lt: threshold } }],
        role: "regular",
      })
    } catch (error) {
      console.error("Error getting inactive users count:", error)
      return 0
    }
  }

  async getRegularUsersCount(): Promise<number> {
    try {
      return await User.countDocuments({ role: "regular" })
    } catch (error) {
      console.error("Error getting regular users count:", error)
      return 0
    }
  }

  async getUserStats(): Promise<any> {
    try {
      const [totalUsers, activeUsers, adminUsers, verifiedUsers, registeredToday, inactiveUsers] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ isEmailVerified: true }),
        this.getRegisteredTodayCount(),
        this.getInactiveUsersCount(),
      ])

      return {
        totalUsers,
        activeUsers,
        adminUsers,
        verifiedUsers,
        registeredToday,
        inactiveUsers,
      }
    } catch (error) {
      throw createError("Failed to fetch user statistics", 500)
    }
  }

  // Private methods
  private async expectUserNameNotExists(userName: string): Promise<void> {
    const user = await User.findOne({ userName })
    if (user) {
      throw createError("Username already exists", 400)
    }
  }

  public verifyIsAllowedToLogin(user: IUser): void {
    const now = new Date()
    if (user.blockExpires && user.blockExpires > now) {
      throw createError("User is blocked", 401)
    }

    if (user.loginAttempts >= this.authConfig.loginAttempts) {
      throw createError("Too many login attempts", 401)
    }
  }

  private async validateCredentialsGetUser(userName: string, password: string): Promise<IUser> {
    const user = await User.findOne({ userName, isActive: true }).select("+password")

    if (!user) {
      throw createError("Invalid username or password", 401)
    }

    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      throw createError("Invalid username or password", 401)
    }

    return user
  }

  private async runPostLogin(user: IUser, success: boolean, request: Request): Promise<void> {
    if (success) {
      this.verifyIsAllowedToLogin(user)
      await this.resetLoginAttempts(user._id as any)
      this.loginRecordsService.addInBackground(user, request)
      await this.registerActivity(user._id)
    } else {
      await this.incrementLoginAttempts(user._id as any)
    }
  }

  private async incrementLoginAttempts(userId: Types.ObjectId): Promise<void> {
    const user = await User.findByIdAndUpdate(userId, { $inc: { loginAttempts: 1 } }, { new: true })

    if (user && user.loginAttempts >= this.authConfig.loginAttempts) {
      await this.blockUser(user)
    }
  }

  private async resetLoginAttempts(userId: Types.ObjectId): Promise<void> {
    await User.findByIdAndUpdate(userId, { loginAttempts: 0 })
  }

  private async blockUser(user: IUser): Promise<void> {
    const blockUntil = new Date()
    blockUntil.setTime(blockUntil.getTime() + this.authConfig.userBlockTime)

    await User.findByIdAndUpdate(user._id, {
      blockExpires: blockUntil,
      loginAttempts: 0,
    })
  }

  private async registerActivity(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { lastLogin: new Date() })
  }
}
