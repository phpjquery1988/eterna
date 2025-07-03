// Main entry point for the application
export { default as app } from "./src/server"

// Re-export all modules for external use
export { User } from "./src/modules/user/user.model"
export { UserService } from "./src/modules/user/user.service"
export { UserController } from "./src/modules/user/user.controller"

export { AuthService } from "./src/modules/auth/auth.service"
export { AuthController } from "./src/modules/auth/auth.controller"

export { AuthUserService } from "./src/modules/auth-user/auth-user.service"
export { AuthUserController } from "./src/modules/auth-user/auth-user.controller"

// Export route modules
export { default as userRoutes } from "./src/modules/user/user.routes"
export { default as authRoutes } from "./src/modules/auth/auth.routes"
export { default as authUserRoutes } from "./src/modules/auth-user/auth-user.routes"

// Export types
export * from "./src/types"

// Export utilities
export { connectDB } from "./src/config/database"
export { authenticateToken, requireRole } from "./src/middleware/auth"
export { errorHandler, createError, asyncHandler } from "./src/middleware/errorHandler"
