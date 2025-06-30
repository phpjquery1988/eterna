import { LicenseStatus, USState } from '@app/contracts';
import { CarrierEnum } from '@app/contracts/enums/carrier-enum';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
export class CreateLicenseDto {
  @IsOptional()
  @ApiProperty()
  agentName: string;

  @IsOptional()
  @ApiProperty()
  npn: string;

  @IsOptional()
  @ApiProperty()
  uplineName: string;

  @IsOptional()
  @ApiProperty()
  uplineNpn: string;

  @ApiProperty()
  @IsOptional()
  carrier: string;

  @IsOptional()
  @ApiProperty()
  stageNumber: string;

  @IsOptional()
  @ApiProperty()
  states: string;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  isDeleted: number;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  id: string;
}

export class UpdateLicenseDto {
  @IsString()
  @IsOptional()
  @ApiProperty()
  licenseType: string;

  @IsEnum(CarrierEnum)
  @IsOptional()
  @ApiProperty()
  carrier: CarrierEnum;

  @IsArray()
  @IsOptional()
  @ApiProperty()
  state: string[];
}

export class getLicenseDto {
  @IsOptional()
  @ApiProperty({
    required: false,
  })
  status: string;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  state: string;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  carrier: string;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  licenseType: string;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  page: number;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  limit: number;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  search: string;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  npn: string;
}

// object id dto
export class ObjectIdDto {
  @IsMongoId()
  @ApiProperty()
  id: string;
}

class SubDocumentDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  code?: string;
}

export class CreateStaticDataDto {
  @IsArray()
  state: SubDocumentDto[];

  @IsArray()
  carrier: SubDocumentDto[];
}

export class LicenseFilterDto {
  @ApiProperty({
    required: true,
  })
  @IsOptional()
  @IsString()
  npn: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsOptional()
  @ApiProperty({
    required: false,
    description: 'Comma-separated carrier names to filter by (e.g., "carrier1,carrier2,carrier3")'
  })
  @IsString()
  carriers: string;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  stageNumbers: string;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  agentName: string;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  page: number;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  limit: number;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  states: string;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  stageNumber: number;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsArray()
  npns: string[];

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  isUser: boolean;
}
