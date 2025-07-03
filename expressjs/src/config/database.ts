import mongoose from "mongoose"

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/nodejs-rest-api"

    const options = {
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
     
    }

    await mongoose.connect(mongoURI, options)

    console.log("✅ MongoDB connected successfully")
    console.log(`📍 Database: ${mongoose.connection.name}`)
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    process.exit(1)
  }
}

// Handle connection events
mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB disconnected")
})

mongoose.connection.on("error", (error) => {
  console.error("❌ MongoDB error:", error)
})

mongoose.connection.on("reconnected", () => {
  console.log("🔄 MongoDB reconnected")
})
