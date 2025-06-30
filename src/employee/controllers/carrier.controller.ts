import {
  Controller,
  Get,
  Body,
  Param,
  BadRequestException,
  Patch,
  UploadedFile,
  UseInterceptors,
  Post,
  Delete,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CarrierService } from '../services/carrier.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { S3Service } from '../services/s3.service';
import { toScreamingSnakeCase } from '../services/helper';

@Controller('v1/carriers')
@ApiTags('carriers')
// @UseGuards(JwtGuard, RolesGuard)
// @Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class CarrierController {
  constructor(
    private readonly carrierService: CarrierService,
    private readonly s3Service: S3Service,
  ) {}

  @Get()
  get() {
    return this.carrierService.allCarriers();
  }

  @Patch(':id')
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
  public async update(
    @Param('id') id: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() updatedData: any,
  ) {
    if (file) {
      const fileName = `carriers/${id}-${Date.now()}-${file.originalname}`;
      const fileUrl = await this.s3Service.uploadFile(
        file.buffer,
        fileName,
        file.mimetype,
      );
      updatedData.imageUrl = fileUrl;
    }

    if (updatedData.carrier) {
      updatedData.slug = toScreamingSnakeCase(updatedData.carrier);
    }

    return this.carrierService.updateCarrier(id, updatedData);
  }

  @Post()
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
  public async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: any,
  ) {
    if (file) {
      const fileName = `carriers/${Date.now()}-${file.originalname}`;
      const fileUrl = await this.s3Service.uploadFile(
        file.buffer,
        fileName,
        file.mimetype,
      );
      data.imageUrl = fileUrl;
    }

    if (data.carrier) {
      data.slug = toScreamingSnakeCase(data.carrier);
    }

    return this.carrierService.createCarrier(data);
  }

  @Post('update-sort-order')
  async updateSortOrder(
    @Body() body: { carriers: { id: number; sortOrder: number }[] },
  ) {
    return this.carrierService.updateSortOrder(body.carriers);
  }

  @Delete(':id')
  public async deleteCarrier(@Param('id') id: any) {

    return this.carrierService.deleteCarrier(id);
  }
}
