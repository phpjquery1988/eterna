import { Twilio } from "twilio"
import { createError } from "../../middleware/errorHandler"

export class TwilioService {
  private twilioClient: any
  private verifyServiceSid: any

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    this.verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID

    if (!accountSid || !authToken || !this.verifyServiceSid) {
      console.warn("⚠️  Twilio credentials not configured. SMS functionality will be disabled.")
      return
    }

    this.twilioClient = new Twilio(accountSid, authToken)
  }

  static getFormattedPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    // phoneNumber = phoneNumber.replace(/\D/g, '');
    return phoneNumber?.startsWith("+1") ? phoneNumber : "+1" + phoneNumber
  }

  async sendOTP(phoneNumber: string): Promise<{ message: string; phone: string }> {
    if (!this.twilioClient) {
      // Fallback to console logging for development
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      console.log(`📱 SMS OTP for ${phoneNumber}: ${otp}`)
      return {
        message: "OTP sent to " + phoneNumber,
        phone: phoneNumber,
      }
    }

    const phone = phoneNumber
    console.log("[phone]", phone)

    try {
      // Create verification service if needed
      if (!this.verifyServiceSid) {
        const service = await this.twilioClient.verify.v2.services.create({
          friendlyName: "OTP Verification Service",
        })
        console.log("[service]", service.sid)
        this.verifyServiceSid = service.sid
      }

      await this.twilioClient.verify.v2.services(this.verifyServiceSid).verifications.create({
        channel: "sms",
        to: phone,
      })

      const message = "OTP sent to: " + phone
      return { message, phone }
    } catch (error) {
      console.error("Twilio SMS Error:", error)
      throw createError("Failed to send OTP. Please try again.", 400)
    }
  }

  async validateOTP(phoneNumber: string, otp: string): Promise<boolean> {
    const nodeEnv = process.env.NODE_ENV

    try {
      const phone = phoneNumber
      console.log("Initiating OTP validation:", { phone, otp })

      // For testing in development
      if (nodeEnv === "development" && otp === "000000") {
        console.log("🧪 Development mode: Using test OTP")
        return true
      }

      if (!this.twilioClient) {
        // Fallback for development without Twilio
        console.log("⚠️  Twilio not configured, using fallback validation")
        return otp === "123456" // Default test OTP
      }

      const verification = await this.twilioClient.verify.v2.services(this.verifyServiceSid).verificationChecks.create({
        to: phone,
        code: otp,
      })

      console.log("Verification response:", verification)

      if (!verification.valid) {
        console.warn("Invalid OTP provided:", { phone, otp })
        return false
      }

      return true
    } catch (error:any) {
      console.error("OTP Validation Error:", error)

      if (error.message?.includes("The requested resource")) {
        throw createError("Invalid service configuration for OTP validation.", 400)
      }

      throw createError("Could not validate OTP. Please try again later.", 400)
    }
  }
}
