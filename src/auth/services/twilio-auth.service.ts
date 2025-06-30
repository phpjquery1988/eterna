import { BadRequestException, Injectable } from '@nestjs/common';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private twilioClient: Twilio;
  private verifyServiceSid: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioClient = new Twilio(accountSid, authToken);
    this.verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  }

  static getFormattedPhoneNumber(phoneNumber: string): string {
    // phoneNumber = phoneNumber.replace(/\D/g, '');
    return phoneNumber?.startsWith('+1') ? phoneNumber : '+1' + phoneNumber;
  }

  async sendOTP(phoneNumber: string): Promise<any> {
    // const phone = TwilioService.getFormattedPhoneNumber(phoneNumber);
    const phone = phoneNumber;

    console.log('[phone]', phone);

    try {
      const service = await this.twilioClient.verify.v2.services.create({
        friendlyName: 'Otp is',
      });

      console.log('[service]', service.sid);

      await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verifications.create({
          channel: 'sms',
          to: phone,
        });
      const message = 'OTP sent one this:' + phone;
      return { message, phone };
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }
  }

  async validateOTP(phoneNumber: string, otp: string): Promise<boolean> {
    const nodeEnv = process.env.NODE_ENV;
    try {
      // const phone = TwilioService.getFormattedPhoneNumber(phoneNumber);
      const phone = phoneNumber;
      console.log('Initiating OTP validation:', { phone, otp });

      // For testing
      if (nodeEnv === 'development' && otp === '000000') return true;

      const verification = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({
          to: phone,
          code: otp,
        });

      console.log('Verification response:', verification);

      if (!verification.valid) {
        console.warn('Invalid OTP provided:', { phone, otp });
        return false;
      }

      return true;
    } catch (error) {
      console.error(error);
      if (error.message.includes('The requested resource')) {
        throw new BadRequestException(
          'Invalid service configuration for OTP validation.',
        );
      }

      throw new BadRequestException(
        'Could not validate OTP. Please try again later.',
      );
    }
  }
}
