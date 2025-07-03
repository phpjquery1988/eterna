import type { IIdentity, IdentityDto, PagedListDto, PaginatedResponse } from "../../types"
import { Types } from "mongoose"
import  UserMappers  from "../user/user.mappers"

export class AuthMappers {
  static identitiesToDtoPaged(source: PaginatedResponse<IIdentity>): PagedListDto<IdentityDto> {
    return {
      docs: this.identitiesToDto(source.data) as IdentityDto[],
      totalDocs: source.pagination.totalItems,
      limit: source.pagination.itemsPerPage,
      page: source.pagination.currentPage,
      totalPages: source.pagination.totalPages,
    }
  }

  static identitiesToDto(source: IIdentity[] | Types.ObjectId[]): IdentityDto[] | any[] {
    if (!source || !Array.isArray(source)) {
      return []
    }

    return source.map((identity: Types.ObjectId | IIdentity) => this.identityToDto(identity))
  }

  static identityToDto(source: IIdentity | Types.ObjectId | string): IdentityDto | any {
    if (!source) {
      return null
    }

    if (typeof source === "string" || source instanceof Types.ObjectId) {
      return source.toString()
    }

    const identity = source as IIdentity

    return {
      id: identity._id?.toString() || identity.id,
      uid: identity.uid,
      userName: identity.userName,
      provider: identity.provider,
      expirationDate: identity.expirationDate?.toISOString(),
      version: identity.version,
      user: UserMappers.userToDto(identity.user as any),
      isActive: identity.isActive,
      createdAt: identity.createdAt?.toISOString(),
      updatedAt: identity.updatedAt?.toISOString(),
    }
  }
}
