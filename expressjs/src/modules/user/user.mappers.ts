import type {
  IUser,
  ILoginRecord,
  UserDto,
  LoginRecordDto,
  UserSettingsDto,
  IdNameDto,
  PagedListDto,
  PaginatedResponse,
} from "../../types"
import { Types } from "mongoose"

export default class UserMappers {
  static usersToDtoPaginated(source: PaginatedResponse<IUser>): PagedListDto<UserDto> {
    return {
      docs: this.usersToDto(source.data) as UserDto[],
      totalDocs: source.pagination.totalItems,
      limit: source.pagination.itemsPerPage,
      page: source.pagination.currentPage,
      totalPages: source.pagination.totalPages,
    }
  }

  static usersToDto(source: IUser[] | Types.ObjectId[]): UserDto[] | any[] {
    if (!source || !Array.isArray(source)) {
      return []
    }

    return source.map((u: Types.ObjectId | IUser) => this.userToDto(u))
  }

  static userToDto(source: IUser | Types.ObjectId | string): UserDto | any {
    if (!source) {
      return null
    }

    if (typeof source === "string" || source instanceof Types.ObjectId) {
      return source.toString()
    }

    const user = source as IUser

    return {
      id: user._id?.toString() || user.id,
      avatar: user.avatar,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString(),
      lastLogin: user.lastLogin?.toISOString(),
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      role: user.role,
      displayName: this.userToDisplayName(user),
      email: user.email,
      address: user.address,
      phone: user.phone,
      country: user.country,
      creator: this.userToDto(user.creator as any),
      settings: this.userSettingsToDto(user.settings),
    }
  }

  static userSettingsToDto(settings: any): UserSettingsDto | null {
    if (!settings) {
      return null
    }

    return {
      currencyCode: settings.currencyCode,
      theme: settings.theme,
      language: settings.language,
    }
  }

  static loginRecordsToDtoPaginated(source: PaginatedResponse<ILoginRecord>): PagedListDto<LoginRecordDto> {
    return {
      docs: this.loginRecordsToDto(source.data) as LoginRecordDto[],
      totalDocs: source.pagination.totalItems,
      limit: source.pagination.itemsPerPage,
      page: source.pagination.currentPage,
      totalPages: source.pagination.totalPages,
    }
  }

  static loginRecordsToDto(source: ILoginRecord[] | Types.ObjectId[]): LoginRecordDto[] | any[] {
    if (!source || !Array.isArray(source)) {
      return []
    }

    return source.map((u: Types.ObjectId | ILoginRecord) => this.loginRecordToDto(u))
  }

  static loginRecordToDto(source: ILoginRecord | Types.ObjectId | string): LoginRecordDto | any {
    if (!source) {
      return null
    }

    if (typeof source === "string" || source instanceof Types.ObjectId) {
      return source.toString()
    }

    const record = source as ILoginRecord

    return {
      id: record._id?.toString() || record.id,
      createdAt: record.createdAt?.toISOString(),
      updatedAt: record.updatedAt?.toISOString(),
      ip: record.ip,
      countryCode: record.countryCode,
      countryName: record.countryName,
      regionName: record.regionName,
      cityName: record.cityName,
      clientType: record.clientType,
      clientName: record.clientName,
      osName: record.osName,
      deviceType: record.deviceType,
      deviceName: record.deviceName,
      isBot: record.isBot,
      user: this.userToDto(record.user as any),
    }
  }

  static userToDisplayName(source: IUser): string {
    if (!source) {
      return "N/A"
    }

    let name = source.firstName

    if (source.lastName) {
      name += " " + source.lastName
    }

    if (!name) {
      name = source.userName
    }

    if (!name) {
      name = source.email
    }

    return name || "N/A"
  }

  static userToIdName(source?: IUser | Types.ObjectId | string): IdNameDto | any {
    if (!source) {
      return null
    }

    if (typeof source === "string" || source instanceof Types.ObjectId) {
      return source.toString()
    }

    const user = source as IUser

    return {
      id: user._id?.toString() || user.id,
      name: this.userToDisplayName(user) || "N/A",
    }
  }
}
