import mongoose, { Schema } from "mongoose"
import type { IIdentity } from "../../types"

const identitySchema = new Schema<IIdentity>(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      maxlength: 1000,
      index: true,
    },
    userName: {
      type: String,
      maxlength: 200,
    },
    token: {
      type: String,
      maxlength: 1000,
    },
    secret: {
      type: String,
      maxlength: 1000,
      select: false,
    },
    refreshToken: {
      type: String,
      maxlength: 1000,
      select: false,
    },
    expirationDate: {
      type: Date,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["username", "phone", "email", "google", "facebook"],
      required: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

// Compound indexes
identitySchema.index({ uid: 1, provider: 1 }, { unique: true })
identitySchema.index({ uid: 1, provider: 1, version: 1 })
identitySchema.index({ user: 1 })
identitySchema.index({ isActive: 1 })
identitySchema.index({ expirationDate: 1 })

export const Identity = mongoose.model<IIdentity>("Identity", identitySchema)
