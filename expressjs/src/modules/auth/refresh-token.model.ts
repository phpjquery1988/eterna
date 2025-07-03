import mongoose, { Schema } from "mongoose"
import type { IRefreshToken } from "../../types"

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: {
      type: String,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    expires: {
      type: Date,
      required: true,
      index: true,
    },
    ip: {
      type: String,
      required: true,
    },
    browser: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    identity: {
      type: Schema.Types.ObjectId,
      ref: "Identity",
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

// Indexes
refreshTokenSchema.index({ token: 1 })
refreshTokenSchema.index({ user: 1 })
refreshTokenSchema.index({ identity: 1 })
refreshTokenSchema.index({ expires: 1 })
refreshTokenSchema.index({ isRevoked: 1, isActive: 1 })

// TTL index to automatically remove expired tokens
refreshTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 })

export const RefreshToken = mongoose.model<IRefreshToken>("RefreshToken", refreshTokenSchema)
