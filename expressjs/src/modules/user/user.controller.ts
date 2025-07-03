import type { Response } from "express"
import { UserService } from "./user.service"
import  LoginRecordsService  from "./login-records.service"
import  UserMappers from "./user.mappers"
import type {
  AuthRequest,
  ApiResponse,
  CreateUserCommand,
  UpdateUserDataCommand,
  UpdateUserPasswordCommand,
  GetUsersQuery,
  GetLoginRecordsQuery,
} from "../../types"
import { asyncHandler } from "../../middleware/errorHandler"
import multer from "multer"
import  sharp from "sharp"
import * as fs from "fs/promises"
import * as path from "path"

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed') as any, false)
    }
  },
})

export class UserController {
  private userService: UserService
  private loginRecordsService: LoginRecordsService

  constructor() {
    this.userService = new UserService()
    this.loginRecordsService = new LoginRecordsService()
  }

  // Create user (Admin only)
  create = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const createUserCommand: CreateUserCommand = req.body
    const createdUser = await this.userService.create(createUserCommand)

    const response: ApiResponse = {
      success: true,
      message: "User created successfully",
      data: UserMappers.userToDto(createdUser),
      timestamp: new Date().toISOString(),
    }

    res.status(201).json(response)
  })

  // Update user basic data (Admin only)
  update = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const command: UpdateUserDataCommand = req.body

    const updatedUser = await this.userService.updateBasicData(id, command)

    const response: ApiResponse = {
      success: true,
      message: "User updated successfully",
      data: UserMappers.userToDto(updatedUser),
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  // Update user password (Admin only)
  updatePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const command: UpdateUserPasswordCommand = req.body

    const updatedUser = await this.userService.updatePassword(id, command)

    const response: ApiResponse = {
      success: true,
      message: "Password updated successfully",
      data: UserMappers.userToDto(updatedUser),
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  // Delete user (Admin only)
  delete = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const deletedUser = await this.userService.deleteUser(id)

    const response: ApiResponse = {
      success: true,
      message: "User deleted successfully",
      data: UserMappers.userToDto(deletedUser),
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  // Get all users with pagination (Admin only)
  getAllUsers = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const query: GetUsersQuery = {
      page: Number.parseInt(req.query.page as string) || 1,
      limit: Number.parseInt(req.query.limit as string) || 10,
      sort: req.query.sort as string,
      search: req.query.search as string,
      userName: req.query.userName as string,
      role: req.query.role as string,
      searchQuery: req.query.searchQuery as string,
    }

    const result = await this.userService.get(query)

    const response: ApiResponse = {
      success: true,
      message: "Users fetched successfully",
      data: UserMappers.usersToDtoPaginated(result),
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  // Get user by ID (Admin only)
  getUserById = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params
    const user = await this.userService.getUserById(id)

    const response: ApiResponse = {
      success: true,
      message: "User fetched successfully",
      data: UserMappers.userToDto(user),
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  // Upload avatar (Admin only)
  uploadAvatar = [
    upload.single("avatar"),
    asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
      const { id } = req.params
      const file = req.file

      if (!file) {
        res.status(400).json({
          success: false,
          message: "No file uploaded",
          timestamp: new Date().toISOString(),
        })
        return
      }

      // Verify user exists
      const user = await this.userService.getUserById(id)
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
          timestamp: new Date().toISOString(),
        })
        return
      }

      // Create uploads directory
      const uploadsDir = process.env.UPLOADS_DIR || "./uploads"
      const savePath = path.join(uploadsDir, "avatars")
      const fileFullPath = path.join(savePath, `${user._id}.webp`)
      const frontendPath = `/uploads/avatars/${user._id}.webp`

      await fs.mkdir(savePath, { recursive: true })

      // Compress and convert to WebP
      const compressedImageBuffer = await sharp(file.buffer).webp({ quality: 75 }).toBuffer()

      await fs.writeFile(fileFullPath, compressedImageBuffer)

      // Update user avatar path
      await this.userService.updateAvatar(id, frontendPath)

      const response: ApiResponse = {
        success: true,
        message: "Avatar uploaded successfully",
        data: { avatarPath: frontendPath },
        timestamp: new Date().toISOString(),
      }

      res.status(200).json(response)
    }),
  ]

  // Get current user
  getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const response: ApiResponse = {
      success: true,
      message: "Current user fetched successfully",
      data: UserMappers.userToDto(req.user!),
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  // Get user statistics (Admin only)
  getUserStats = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const stats = await this.userService.getUserStats()

    const response: ApiResponse = {
      success: true,
      message: "User statistics fetched successfully",
      data: stats,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  // Get login records (Admin only)
  getLoginRecords = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const query: GetLoginRecordsQuery = {
      page: Number.parseInt(req.query.page as string) || 1,
      limit: Number.parseInt(req.query.limit as string) || 10,
      sort: req.query.sort as string,
      userId: req.query.userId as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    }

    const result = await this.loginRecordsService.get(query)

    const response: ApiResponse = {
      success: true,
      message: "Login records fetched successfully",
      data: UserMappers.loginRecordsToDtoPaginated(result),
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  // Get weekly device summary (Admin only)
  getWeeklyDeviceSummary = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const summary = await this.loginRecordsService.weeklyByDeviceSummary()

    const response: ApiResponse = {
      success: true,
      message: "Weekly device summary fetched successfully",
      data: summary,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })

  // Get weekly country summary (Admin only)
  getWeeklyCountrySummary = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const summary = await this.loginRecordsService.weeklyByCountrySummary()

    const response: ApiResponse = {
      success: true,
      message: "Weekly country summary fetched successfully",
      data: summary,
      timestamp: new Date().toISOString(),
    }

    res.status(200).json(response)
  })
}
