import mongoose, { Schema } from "mongoose"
import bcrypt from "bcryptjs"
import type { IUser } from "../../types"

// User Settings Schema
const userSettingsSchema = new Schema(
  {
    currencyCode: {
      type: String,
      maxlength: 10,
    },
    language: {
      type: String,
      maxlength: 10,
    },
    theme: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

const userSchema = new Schema<IUser>(
  {
    avatar: {
      type: String,
      maxlength: 1000,
    },
    firstName: {
      type: String,
      maxlength: 200,
    },
    lastName: {
      type: String,
      maxlength: 200,
    },
    userName: {
      type: String,
      maxlength: 500,
      minlength: 3,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 5,
      maxlength: 255,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ["user", "admin", "regular"],
        message: "Role must be user, admin, or regular",
      },
      default: "regular",
    },
    address: {
      type: String,
      maxlength: 1000,
    },
    phone: {
      type: String,
      maxlength: 200,
    },
    country: {
      type: String,
      minlength: 2,
      maxlength: 10,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    blockExpires: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      index: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    settings: {
      type: userSettingsSchema,
    },
    otherPhones: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password
        return ret
      },
    },
  },
)

// Indexes
userSchema.index({ email: 1 })
userSchema.index({ userName: 1 })
userSchema.index({ isActive: 1 })
userSchema.index({ role: 1 })
userSchema.index({
  firstName: "text",
  lastName: "text",
  userName: "text",
})

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error as Error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`
})

// Virtual for display name
userSchema.virtual("displayName").get(function () {
  let name = this.firstName
  if (this.lastName) {
    name += " " + this.lastName
  }
  if (!name) {
    name = this.userName
  }
  if (!name) {
    name = this.email
  }
  return name || "N/A"
})

export const User = mongoose.model<IUser>("User", userSchema)
