import mongoose, { Schema } from "mongoose"
import type { ILoginRecord } from "../../types"

const loginRecordSchema = new Schema<ILoginRecord>(
  {
    ip: {
      type: String,
      required: true,
    },
    countryCode: {
      type: String,
    },
    countryName: {
      type: String,
    },
    regionName: {
      type: String,
    },
    cityName: {
      type: String,
    },
    clientType: {
      type: String,
    },
    clientName: {
      type: String,
    },
    osName: {
      type: String,
    },
    deviceType: {
      type: String,
    },
    deviceName: {
      type: String,
    },
    isBot: {
      type: Boolean,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
loginRecordSchema.index({ user: 1 })
loginRecordSchema.index({ createdAt: -1 })
loginRecordSchema.index({ ip: 1 })

export const LoginRecord = mongoose.model<ILoginRecord>("LoginRecord", loginRecordSchema)
