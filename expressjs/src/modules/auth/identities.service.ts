import { Identity } from "./identity.model"
import type { IIdentity, IUser, CreateIdentityCommand, GetIdentitiesQuery, PaginatedResponse } from "../../types"
import { createError } from "../../middleware/errorHandler"

export class IdentitiesService {
  async get(query: GetIdentitiesQuery): Promise<PaginatedResponse<IIdentity>> {
    try {
      const page = Math.max(1, query.page || 1)
      const limit = Math.min(50, Math.max(1, query.limit || 10))
      const skip = (page - 1) * limit

      // Build search filter
      const filter: any = { isActive: true }

      if (query.provider) {
        filter.provider = query.provider
      }

      if (query.userId) {
        filter.user = query.userId
      }

      if (query.search) {
        filter.$or = [
          { uid: { $regex: query.search, $options: "i" } },
          { userName: { $regex: query.search, $options: "i" } },
        ]
      }

      // Build sort
      const sortOptions: any = {}
      if (query.sort) {
        const [field, order] = query.sort.split(":")
        sortOptions[field] = order === "desc" ? -1 : 1
      } else {
        sortOptions.createdAt = -1
      }

      const [identities, totalItems] = await Promise.all([
        Identity.find(filter)
          .populate("user", "firstName lastName userName email")
          .select("-secret")
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Identity.countDocuments(filter),
      ])

      const totalPages = Math.ceil(totalItems / limit)

      return {
        data: identities as IIdentity[],
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
      throw createError("Failed to fetch identities", 500)
    }
  }

  async createIdentity(user: IUser, secret: string): Promise<IIdentity> {
    try {
      console.log("[Creating new Identity]", user.userName, secret)

      const identityData = {
        uid: user.userName,
        userName: user.userName,
        provider: "username" as const,
        secret: secret,
        expirationDate: new Date("2099-12-31"), // End of time equivalent
        version: 1,
        user: user._id,
      }

      const identity = new Identity(identityData)
      return await identity.save()
    } catch (error) {
      throw createError("Failed to create identity", 500)
    }
  }

  async getByUid(
    uid: string,
    provider: "username" | "phone" | "email" | "google" | "facebook",
  ): Promise<IIdentity | null> {
    try {
      return await Identity.findOne({
        uid,
        provider,
        isActive: true,
      }).lean()
    } catch (error) {
      throw createError("Failed to find identity by UID", 500)
    }
  }

  async getByUserId(
    userId: string,
    provider: "username" | "phone" | "email" | "google" | "facebook",
  ): Promise<IIdentity | null> {
    try {
      return await Identity.findOne({
        user: userId,
        provider,
        isActive: true,
      }).lean()
    } catch (error) {
      throw createError("Failed to find identity by user ID", 500)
    }
  }

  async getByUserIds(
    userIds: string[],
    provider: "username" | "phone" | "email" | "google" | "facebook",
  ): Promise<IIdentity[]> {
    try {
      return await Identity.find({
        user: { $in: userIds },
        provider,
        isActive: true,
      }).lean()
    } catch (error) {
      throw createError("Failed to find identities by user IDs", 500)
    }
  }

  async getValid(
    userId: string,
    provider: "username" | "phone" | "email" | "google" | "facebook",
    version?: number,
  ): Promise<IIdentity | null> {
    try {
      const query: any = {
        user: userId,
        expirationDate: { $gte: new Date() },
        provider,
        isActive: true,
      }

      if (version) {
        query.version = version
      }

      return await Identity.findOne(query).select("+secret").lean()
    } catch (error) {
      throw createError("Failed to fetch valid identity", 500)
    }
  }

  async deleteForUser(userId: string): Promise<void> {
    try {
      await Identity.deleteMany({ user: userId })
    } catch (error) {
      throw createError("Failed to delete user identities", 500)
    }
  }

  async updateToken(id: string, token: string, refreshToken: string): Promise<IIdentity> {
    try {
      const identity = await Identity.findByIdAndUpdate(
        id,
        {
          $set: {
            token,
            refreshToken,
          },
        },
        { new: true },
      ).select("-secret")

      if (!identity) {
        throw createError("Identity not found", 404)
      }

      return identity
    } catch (error) {
      if (error instanceof Error && error.message === "Identity not found") {
        throw error
      }
      throw createError("Failed to update identity token", 500)
    }
  }

  async updateSecret(id: string, secret: string, changeVersion = false): Promise<IIdentity> {
    try {
      const updateData: any = {
        $set: {
          secret,
        },
      }

      if (changeVersion) {
        updateData.$inc = { version: 1 }
      }

      const identity = await Identity.findByIdAndUpdate(id, updateData, {
        new: true,
        lean: true,
      }).select("-secret")

      if (!identity) {
        throw createError("Identity not found", 404)
      }

      return identity
    } catch (error) {
      if (error instanceof Error && error.message === "Identity not found") {
        throw error
      }
      throw createError("Failed to update identity secret", 500)
    }
  }

  async baseCreate(command: CreateIdentityCommand): Promise<IIdentity> {
    try {
      const identity = new Identity(command)
      return await identity.save()
    } catch (error) {
      throw createError("Failed to create identity", 500)
    }
  }

  async findByUidAndProvider(
    uid: string,
    provider: "username" | "phone" | "email" | "google" | "facebook",
  ): Promise<IIdentity | null> {
    try {
      return await Identity.findOne({
        uid,
        provider,
        isActive: true,
        expirationDate: { $gt: new Date() },
      }).select("+secret")
    } catch (error) {
      throw createError("Failed to find identity", 500)
    }
  }

  async deactivateUserIdentities(userId: string): Promise<void> {
    try {
      await Identity.updateMany({ user: userId }, { isActive: false })
    } catch (error) {
      throw createError("Failed to deactivate user identities", 500)
    }
  }

  async updateTokens(identityId: string, token: string, refreshToken: string): Promise<IIdentity> {
    try {
      const identity = await Identity.findByIdAndUpdate(
        identityId,
        {
          token,
          refreshToken,
          updatedAt: new Date(),
        },
        { new: true },
      ).select("-secret")

      if (!identity) {
        throw createError("Identity not found", 404)
      }

      return identity
    } catch (error) {
      if (error instanceof Error && error.message === "Identity not found") {
        throw error
      }
      throw createError("Failed to update identity tokens", 500)
    }
  }

  async expectEntityExists(id: string, errorCode: string): Promise<IIdentity> {
    try {
      const identity = await Identity.findById(id).select("+secret")
      if (!identity) {
        throw createError(`Identity not found: ${errorCode}`, 404)
      }
      return identity
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error
      }
      throw createError("Failed to fetch identity", 500)
    }
  }
}
