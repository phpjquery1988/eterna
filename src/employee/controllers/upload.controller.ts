import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import * as XLSX from 'xlsx';
import { UploadFilesDto } from '../dto/upload-files.dto';
import { UploadService } from '../services/upload.service';
import { parseDateFields, transformKeysToCamelCase } from 'src/shared/helper';
import { UserRoleEnum } from '@app/contracts';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { UploadTypeEnum } from '@app/contracts/enums/upload.enum';

@Controller('v1/upload')
@ApiTags('Upload')
// @UseGuards(JwtGuard, RolesGuard)
// @Roles(UserRoleEnum.Admin)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async getPolicyEarning(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFilesDto: UploadFilesDto,
  ) {
    try {
      if (!file) {
        throw new Error('File not provided');
      }
      // Parse the uploaded Excel file
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
        raw: false,
        dateNF: 'mm-dd-yyyy',
        defval: '',
      });
      const transformedData = transformKeysToCamelCase(data);

      let transformedTakeactionData: any;
      if (uploadFilesDto.type === UploadTypeEnum.BOOK_OF_BUSINESS) {
        const takeActionSheetName = workbook.SheetNames[1];
        const takeactionSheet = workbook.Sheets[takeActionSheetName];
        const takeactionData: Record<string, any>[] = XLSX.utils.sheet_to_json(
          takeactionSheet,
          {
            raw: false,
            dateNF: 'mm-dd-yyyy',
            defval: '',
          },
        );
        transformedTakeactionData = transformKeysToCamelCase(takeactionData);
      }

      return this.uploadService.upload(
        transformedData,
        uploadFilesDto.type,
        transformedTakeactionData,
      );
    } catch (error) {
      return { error: error.message };
    }
  }
}
