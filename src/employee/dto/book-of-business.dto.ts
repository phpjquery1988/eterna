import { IsString, IsDate, IsArray } from "class-validator";
import { IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class BookOfBusinessFilterDto {
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

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  policyNumber: string;
}
