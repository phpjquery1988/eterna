import type { Request, Response, NextFunction } from "express"

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (error: AppError, req: Request, res: Response, next: NextFunction): void => {
  const statusCode = error.statusCode || 500
  const message = error.message || "Internal Server Error"

  console.error(`❌ Error ${statusCode}: ${message}`)
  console.error(error.stack)

  res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  })
}

export const createError = (message: string, statusCode = 500): AppError => {
  const error: AppError = new Error(message)
  error.statusCode = statusCode
  error.isOperational = true
  return error
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
