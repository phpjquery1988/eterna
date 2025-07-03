import type { Request } from "express"
import type { Document, Types } from "mongoose"

export interface IUserSettings {
  currencyCode?: string
  language?: string
  theme?: string
}

export interface IUser extends Document {
  _id: string
  avatar?: string
  firstName?: string
  lastName?: string
  userName?: string
  email: string
  password: string
  role: "user" | "admin" | "regular"
  address?: string
  phone?: string
  country?: string
  loginAttempts: number
  blockExpires: Date
  lastLogin?: Date
  creator?: Types.ObjectId | IUser
  settings?: IUserSettings
  otherPhones?: string[]
  isActive: boolean
  isEmailVerified: boolean
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
  displayName?: string
  fullName?: string
}

export interface IIdentity extends Document {
  _id: string
  uid: string
  userName?: string
  token: string
  secret?: string
  refreshToken?: string
  expirationDate: Date
  provider: "username" | "phone" | "email" | "google" | "facebook"
  version: number
  user: Types.ObjectId | IUser
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ILoginRecord extends Document {
  _id: string
  ip: string
  countryCode?: string
  countryName?: string
  regionName?: string
  cityName?: string
  clientType?: string
  clientName?: string
  osName?: string
  deviceType?: string
  deviceName?: string
  isBot?: boolean
  user: Types.ObjectId | IUser
  createdAt: Date
  updatedAt: Date
}

export interface IOtpRecord extends Document {
  _id: string
  phoneNumber: string
  otp: string
  expiresAt: Date
  attempts: number
  isUsed: boolean
  purpose: "login" | "verification" | "password_reset"
  createdAt: Date
  updatedAt: Date
}

export interface IpLocation {
  ip: string
  ip_number: string
  ip_version: number
  country_name: string
  country_code2: string
  isp: string
  response_code: string
  response_message: string
}

export interface AuthRequest extends Request {
  user?: IUser
  identity?: IIdentity
}

export interface LoginCredentials {
  email?: string
  password?: string
  userName?: string
  phoneNumber?: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  userName?: string
}

export interface CreateUserCommand {
  email?: string
  password: string
  firstName?: string
  lastName?: string
  userName: string
  role?: "user" | "admin" | "regular"
  phone?: string
  address?: string
  country?: string
}

export interface CreateIdentityCommand {
  uid: string
  userName: string
  provider: "username" | "phone" | "email" | "google" | "facebook"
  secret: string
  expirationDate: Date
  version: number
  user: string
}

export interface UpdateUserDataCommand {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
  country?: string
  avatar?: string
  settings?: IUserSettings
}

export interface UpdateUserPasswordCommand {
  password: string
  logOutEverywhere?: boolean
}

export interface GetUsersQuery {
  page?: number
  limit?: number
  sort?: string
  search?: string
  userName?: string
  role?: string
  searchQuery?: string
}

export interface GetIdentitiesQuery {
  page?: number
  limit?: number
  sort?: string
  search?: string
  provider?: string
  userId?: string
}

export interface GetLoginRecordsQuery {
  page?: number
  limit?: number
  sort?: string
  userId?: string
  startDate?: Date
  endDate?: Date
}

export interface OtpLoginRequest {
  phoneNumber: string
}

export interface OtpVerificationRequest {
  phoneNumber: string
  otp: string
}

export interface AdminOtpLoginRequest {
  phoneNumber: string
  npn: string
}

export interface AdminOtpVerificationRequest {
  phoneNumber: string
  otp: string
  npn: string
}

export interface UpdatePhoneRequest {
  userName: string
  phoneNumber: string
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
  timestamp?: string
}

export interface PaginationQuery {
  page?: number
  limit?: number
  sort?: string
  search?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface UserDto {
  id: string
  avatar?: string
  firstName?: string
  lastName?: string
  userName?: string
  email?: string
  role: string
  displayName?: string
  address?: string
  phone?: string
  country?: string
  lastLogin?: string
  createdAt?: string
  updatedAt?: string
  creator?: UserDto | string
  settings?: UserSettingsDto
}

export interface IdentityDto {
  id: string
  uid: string
  userName: string
  provider: string
  expirationDate: string
  version: number
  user: UserDto | string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserSettingsDto {
  currencyCode?: string
  language?: string
  theme?: string
}

export interface LoginRecordDto {
  id: string
  ip: string
  countryCode?: string
  countryName?: string
  regionName?: string
  cityName?: string
  clientType?: string
  clientName?: string
  osName?: string
  deviceType?: string
  deviceName?: string
  isBot?: boolean
  user: UserDto | string
  createdAt?: string
  updatedAt?: string
}

export interface IdNameDto {
  id: string
  name: string
}

export interface PagedListDto<T> {
  docs: T[]
  totalDocs: number
  limit: number
  page: number
  totalPages: number
}

export interface LoginSuccessResponse {
  user: UserDto
  token: string
  refreshToken: string
  expiresIn: string
}

export interface RefreshTokenResponse {
  token: string
  refreshToken: string
  expiresIn: string
}

export interface IRefreshToken extends Document {
  _id: string
  token: string
  isRevoked: boolean
  expires: Date
  ip: string
  browser: string
  country: string
  user: Types.ObjectId | IUser
  identity: Types.ObjectId | IIdentity
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TokenPayload {
  username: string
  sub: string
  role: string
  version: number
  provider: "username" | "phone" | "email" | "google" | "facebook"
  iat?: number
  exp?: number
}

export interface RefreshTokenDto {
  id: string
  token: string
  isRevoked: boolean
  expires: string
  ip: string
  browser: string
  country: string
  user: UserDto | string
  identity: IdentityDto | string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
