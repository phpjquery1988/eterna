import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
export class CreateCompensationDto {
  @ApiProperty()
  @IsOptional()
  carrier: string;

  @IsOptional()
  @ApiProperty()
  type: string;

  @IsOptional()
  @ApiProperty()
  product: string;

  @IsOptional()
  @ApiProperty()
  isDeleted: number;

  @IsOptional()
  @ApiProperty()
  id: string;

  @IsOptional()
  @ApiProperty()
  __EMPTY?: string;

  @IsOptional()
  @ApiProperty()
  __EMPTY_1?: string;
}

export class CompensationFilterDto {
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

  @ApiProperty({
    required: true,
    description: 'Comma-separated carrier names to filter by (e.g., "carrier1,carrier2,carrier3")'
  })
  @IsOptional()
  @IsString()
  carrier: string;

  @ApiProperty({
    required: true,
  })
  @IsOptional()
  @IsString()
  type: string;

  @ApiProperty({
    required: true,
  })
  @IsOptional()
  @IsString()
  product: string;
}
