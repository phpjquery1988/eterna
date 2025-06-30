import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Patch,
  Body,
  BadRequestException,
  UseInterceptors,
  Post,
  UploadedFile,
  Delete,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRoleEnum } from '@app/contracts';
import { EmployeeProfileService } from '../services/employee.profile.service';
import { Request as ReqObj } from 'express';
import { User } from 'src/users/model/user.model';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import * as multer from 'multer';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('v1/employee/profiles')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class EmployeeProfileController {
  constructor(
    private readonly employeeProfileService: EmployeeProfileService,
  ) {}

  @Get('upline')
  getProfileForUpline(@Request() req: ReqObj) {
    const user = req.user as User;
    const receiverNpn = user?.userName;
    return this.employeeProfileService.getProfileForUpline(
      receiverNpn,
      req.query,
    );
  }

  @Get('pending')
  getPendingProfileForUpline(@Request() req: ReqObj) {
    const user = req.user as User;
    const receiverNpn = user?.userName;
    return this.employeeProfileService.getPendingProfilesForUpline(
      receiverNpn,
      req.query,
    );
  }


  @Post('publish')
  publishProfiles(@Request() req: ReqObj) {
    const user = req.user as User;
    const receiverNpn = user?.userName;
    const role = user?.role;
    return this.employeeProfileService.publishProfiles(
      receiverNpn,
      role,
      req.body,
    );
  }

  @Post('unpublish')
  unpublishProfiles(@Request() req: ReqObj) {
    const user = req.user as User;
    const receiverNpn = user?.userName;
    const role = user?.role;

    return this.employeeProfileService.unpublishProfiles(
      receiverNpn,
      role,
      req.body,
    );
  }

  @Post('disable')
  disableProfiles(@Request() req: ReqObj) {
    const user = req.user as User;
    const receiverNpn = user?.userName;
    const role = user?.role;
    return this.employeeProfileService.disableProfiles(
      receiverNpn,
      role,
      req.body,
    );
  }

  @Post('enable')
  enableProfiles(@Request() req: ReqObj) {
    const user = req.user as User;
    const receiverNpn = user?.userName;
    const role = user?.role;

    return this.employeeProfileService.enableProfiles(
      receiverNpn,
      role,
      req.body,
    );
  }

  @Get(':npn')
  getProfile(@Param('npn') npn: string, @Request() req: ReqObj) {
    const user = req.user as User;
    const receiverNpn = user?.userName;
    return this.employeeProfileService.getProfile(npn, receiverNpn);
  }

  @Get(':npn/public')
  @Public()
  getPublicProfile(@Param('npn') npn: string) {
    return this.employeeProfileService.getPublicProfile(npn);
  }

  @Post(':npn')
  submitProfile(@Param('npn') npn: string, @Request() req: ReqObj) {
    const user = req.user as User;
    const receiverNpn = user?.userName;
    return this.employeeProfileService.submitProfile(npn, receiverNpn);
  }

  @Patch(':npn')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'familyPhoto', maxCount: 1 },
      ],
      {
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
        fileFilter: (req, file, callback) => {
          // Only allow image files (jpg, jpeg, png, gif)
          if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return callback(
              new BadRequestException('Only image files are allowed!'),
              false,
            );
          }
          callback(null, true);
        },
      },
    ),
  )
  updateProfile(
    @Param('npn') npn: string,
    @Request() req: ReqObj,
    @Body() formData: any,
  ) {
    const user = req.user as User;
    const receiverNpn = user?.userName;

    // Type assertion to inform TypeScript about the object structure
    const files = req.files as {
      avatar?: Express.Multer.File[];
      familyPhoto?: Express.Multer.File[];
    };

    const avatarFile = files?.avatar ? files.avatar[0] : undefined;
    const familyPhotoFile = files?.familyPhoto
      ? files.familyPhoto[0]
      : undefined;

    return this.employeeProfileService.updateProfile(
      npn,
      receiverNpn,
      formData,
      avatarFile,
      familyPhotoFile,
    );
  }

  @Post(':npn/licenses/:postal')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
      fileFilter: (req, file, callback) => {
        // Only allow image files (jpg, jpeg, png, gif)
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
          return callback(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  public async addLicense(
    @Param('npn') npn: string,
    @Param('postal') postal: string,
    @Request() req: ReqObj,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const user = req.user as User;
    const receiverNpn = user?.userName;

    return this.employeeProfileService.addLicense(
      npn,
      receiverNpn,
      postal,
      file,
    );
  }

  @Delete(':npn/licenses/:postal')
  public async removeLicense(
    @Param('npn') npn: string,
    @Param('postal') postal: string,
    @Request() req: ReqObj,
  ) {
    const user = req.user as User;
    const receiverNpn = user?.userName;

    return this.employeeProfileService.removeLicense(npn, receiverNpn, postal);
  }

  @Post(':npn/carriers')
  public async addCarriers(@Param('npn') npn: string, @Request() req: ReqObj) {
    const user = req.user as User;
    const receiverNpn = user?.userName;

    return this.employeeProfileService.addCarriers(npn, receiverNpn, req.body);
  }
}
