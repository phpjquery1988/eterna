import { Controller, Request, Post, UseGuards, Body } from '@nestjs/common';
import { Request as ReqObj } from 'express';
import { AppUnauthorizedException } from 'src/shared/exceptions/app-unauthorized-exception';
import { ErrorCode, IdentityProviderEnum } from '@app/contracts';
import { AuthService } from '../services/auth.service';
import { LocalUsernamePasswordAuthGuard } from '../guards/local-username-password.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalUsernamePasswordAuthGuard)
  @Post('login')
  async login(@Request() req: ReqObj) {
    return this.authService.getLoginSuccessResponse(
      req,
      IdentityProviderEnum.UserName,
    );
  }

  @Post('loginviaotp')
  async loginviaotp(
    @Request() req: ReqObj,
    @Body() body: { phoneNumber: string },
  ) {
    console.log('[Send Otp] PhoneNumber', body.phoneNumber);
    return this.authService.sendLoginOtp(req, body);
  }

  @Post('verification/otp')
  async loginOtp(
    @Request() req: ReqObj,
    @Body() body: { phoneNumber: string; otp: string },
  ) {
    console.log('[Verify Otp] PhoneNumber & otp', body.phoneNumber, body.otp);
    return this.authService.verifyOtpLogin(req, body);
  }

  @Post('sendloginotp/admin')
  async sendLoginOtpToAdmin(
    @Request() req: ReqObj,
    @Body() body: { phoneNumber: string; npn: string },
  ) {
    console.log('[Send Otp] PhoneNumber', body.phoneNumber);
    return this.authService.sendLoginOtpToAdminOfOtherUser(req, body);
  }

  @Post('verification/otp/admin')
  async verifyLoginOtpToAdmin(
    @Request() req: ReqObj,
    @Body() body: { phoneNumber: string; otp: string; npn: string },
  ) {
    return this.authService.verifyOtpLoginToAdminOfOtherUser(req, body);
  }

  @Post('update/phone')
  async updatePhone(@Body() body: { userName: string; phoneNumber: string }) {
    return this.authService.updatePhoneNumberAndSendOtp(
      body.userName,
      body.phoneNumber,
    );
  }

  @Post('refresh')
  async refresh(@Request() req: ReqObj) {
    const refreshToken = req.get('X-Auth-Refresh-Token');
    if (!refreshToken) {
      throw new AppUnauthorizedException(ErrorCode.REFRESH_TOKEN_MISSING);
    }

    const validateResponse = await this.authService.validateRefreshToken(
      req,
      refreshToken,
    );
    return this.authService.getRefreshTokenSuccessResponse(
      validateResponse.user,
      validateResponse.identity,
    );
  }
}
