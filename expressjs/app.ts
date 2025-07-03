import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import { connectDB } from "./src/config/database"
import { errorHandler } from "./src/middleware/errorHandler"
import authRoutes from "./src/modules/auth/auth.routes"
import authUserRoutes from "./src/modules/auth-user/auth-user.routes"
import userRoutes from "./src/modules/user/user.routes"

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
app.use("/api/auth", authRoutes)
app.use("/api/auth-user", authUserRoutes)
app.use("/api/users", userRoutes)

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" })
})

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

export default app
