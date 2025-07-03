import { LoginRecord } from "./login-record.model"
import type { ILoginRecord, GetLoginRecordsQuery, PaginatedResponse, IUser } from "../../types"
import { createError } from "../../middleware/errorHandler"
import { IpLocationService } from "../../services/iplocation.service"
import type { Request } from "express"
import * as requestIp from "request-ip"
import DeviceDetector from "device-detector-js";

export default  class LoginRecordsService {
  private ipLocationService: IpLocationService

  constructor() {
    this.ipLocationService = new IpLocationService()
  }

  async get(query: GetLoginRecordsQuery): Promise<PaginatedResponse<ILoginRecord>> {
    try {
      const page = Math.max(1, query.page || 1)
      const limit = Math.min(50, Math.max(1, query.limit || 10))
      const skip = (page - 1) * limit

      // Build filter
      const filter: any = {}
      if (query.userId) {
        filter.user = query.userId
      }
      if (query.startDate) {
        filter.createdAt = { $gte: query.startDate }
      }
      if (query.endDate) {
        if (!filter.createdAt) {
          filter.createdAt = {}
        }
        filter.createdAt.$lte = query.endDate
      }

      // Build sort
      const sortOptions: any = {}
      if (query.sort) {
        const [field, order] = query.sort.split(":")
        sortOptions[field] = order === "desc" ? -1 : 1
      } else {
        sortOptions.createdAt = -1
      }

      const [records, totalItems] = await Promise.all([
        LoginRecord.find(filter)
          .populate("user", "firstName lastName userName email")
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        LoginRecord.countDocuments(filter),
      ])

      const totalPages = Math.ceil(totalItems / limit)

      return {
        data: records as ILoginRecord[],
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
      throw createError("Failed to fetch login records", 500)
    }
  }

  async weeklyByDeviceSummary(): Promise<any[]> {
    try {
      const startDate = new Date()
      startDate.setTime(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)

      const result = await LoginRecord.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: "$deviceType", count: { $sum: 1 } } },
      ])

      return result
    } catch (error) {
      throw createError("Failed to get device summary", 500)
    }
  }

  async weeklyByCountrySummary(): Promise<any[]> {
    try {
      const startDate = new Date()
      startDate.setTime(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)

      const result = await LoginRecord.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: "$countryName", count: { $sum: 1 } } },
      ])

      return result
    } catch (error) {
      throw createError("Failed to get country summary", 500)
    }
  }

  async addLoginEntry(user: IUser, request: Request): Promise<ILoginRecord | null> {
    try {
      // Skip admin users
      if (user.role === "admin") {
        return null
      }

      const ip = requestIp.getClientIp(request)?.replace(/^.*:/, "") || "unknown"
      const geoData = await this.ipLocationService.getLocation(ip)

      const userAgent = request.headers["user-agent"]
      let deviceData:any= null
      if (userAgent) {
        const detector = new DeviceDetector()
        deviceData = detector.parse(userAgent)
      }

      const loginRecordData = {
        ip,
        countryCode: geoData?.country_code2,
        countryName: geoData?.country_name,
        clientType: deviceData?.client?.type,
        clientName: deviceData?.client?.name,
        osName: deviceData?.os?.name,
        deviceType: deviceData?.device?.type,
        deviceName: deviceData?.device?.name,
        isBot: !!deviceData?.bot,
        user: user._id,
      }

      const loginRecord = new LoginRecord(loginRecordData)
      return await loginRecord.save()
    } catch (error) {
      console.error("Error saving login record:", error)
      return null
    }
  }

  addInBackground(user: IUser, request: Request): void {
    this.addLoginEntry(user, request)
      .then(() => null)
      .catch((err) => console.error("Error while saving login records:", err))
  }
}
