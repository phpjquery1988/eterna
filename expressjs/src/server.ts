import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import dotenv from "dotenv"
import { connectDB } from "./config/database"
import { errorHandler } from "./middleware/errorHandler"
import authRoutes from "./modules/auth/auth.routes"
import authUserRoutes from "./modules/auth-user/auth-user.routes"
import userRoutes from "./modules/user/user.routes"
import healthRoutes from "./routes/health"

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet())
app.use(cors())
app.use(morgan("combined"))
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Database connection
connectDB()

// Routes
app.use("/auth", authRoutes)
app.use("/auth-user", authUserRoutes)
app.use("/users", userRoutes)
app.use("/health", healthRoutes)

// Health check
// app.get("/health", (req, res) => {
//   res.status(200).json({
//     status: "OK",
//     message: "Server is running",
//     timestamp: new Date().toISOString(),
//   })
// })

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
})

export default app
