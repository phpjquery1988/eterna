import { ApiProperty } from "@nestjs/swagger";
import { DateRangeDto, OnlyDateRangeDto } from "./date-range.dto";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class performanceStatsDto extends DateRangeDto {
   @IsOptional()
   @ApiProperty({ required: false })
   page: number

   @IsOptional()
   @ApiProperty({ required: false })
   limit: number

   @IsOptional()
   @ApiProperty({required: false})
   productType: string

}

export class policyDetailerDto extends OnlyDateRangeDto {

   @ApiProperty({ required: false })
   @IsString()
   @IsOptional()
   search: string
   @ApiProperty({ required: false })
   @IsOptional()
   page: number
   @ApiProperty({ required: false })
   @IsOptional()
   limit: number
   @ApiProperty({ required: false })
   @IsString()
   @IsOptional()
   status: string

   @ApiProperty({ required: false })
   @IsString()
   @IsOptional()
   npn: string

   @ApiProperty({ required: false })
   @IsString()
   @IsOptional()
   cancelledStatusFilter: string

   @ApiProperty({ required: false })
   @IsString()
   @IsOptional()
   type: string
}