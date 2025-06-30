import {
  Controller,
  Post,
  Body,
  ForbiddenException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { UserRoleEnum } from '@app/contracts';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('api/token')
export class TokenController {
  constructor(private jwtService: JwtService) {}

  @Post('generate')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRoleEnum.Admin)
  generateToken(@Req() req: any, @Body('userId') userId: string) {
    if (!userId) {
      throw new ForbiddenException('User ID is required.');
    }

    // Define claims for the token
    const payload = {
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
    };

    // Sign and return token
    const token = this.jwtService.sign(payload);

    return { token };
  }
}
