import type { Request, Response, NextFunction } from "express"
import { body, validationResult } from "express-validator"

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
      timestamp: new Date().toISOString(),
    })
    return
  }
  next()
}

export const registerValidation = [
  body("email").optional().isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  body("firstName").optional().trim().isLength({ min: 2 }).withMessage("First name must be at least 2 characters long"),
  body("lastName").optional().trim().isLength({ min: 2 }).withMessage("Last name must be at least 2 characters long"),
  body("userName").optional().isLength({ min: 3 }).withMessage("Username must be at least 3 characters long"),
  body("role").optional().isIn(["user", "admin", "regular"]).withMessage("Invalid role"),
  handleValidationErrors,
]

export const loginValidation = [
  body("email").optional().isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("userName").optional().isLength({ min: 3 }).withMessage("Username must be at least 3 characters long"),
  body("password").optional().notEmpty().withMessage("Password is required when not using OTP"),
  handleValidationErrors,
]

export const otpValidation = [
  body("phoneNumber").isLength({ min: 10 }).withMessage("Please provide a valid phone number"),
  handleValidationErrors,
]

export const phoneUpdateValidation = [
  body("userName").isLength({ min: 3 }).withMessage("Username is required"),
  body("phoneNumber").isMobilePhone("any").withMessage("Please provide a valid phone number"),
  handleValidationErrors,
]

export const updateUserValidation = [
  body("email").optional().isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("firstName").optional().trim().isLength({ min: 2 }).withMessage("First name must be at least 2 characters long"),
  body("lastName").optional().trim().isLength({ min: 2 }).withMessage("Last name must be at least 2 characters long"),
  body("userName").optional().isLength({ min: 3 }).withMessage("Username must be at least 3 characters long"),
  body("phone").optional().isMobilePhone("any").withMessage("Please provide a valid phone number"),
  handleValidationErrors,
]

export const updatePasswordValidation = [
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  body("logOutEverywhere").optional().isBoolean().withMessage("logOutEverywhere must be a boolean"),
  handleValidationErrors,
]

export const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters long"),
  handleValidationErrors,
]
