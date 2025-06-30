import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsDate } from "class-validator";
import { Type } from "class-transformer";

export class DateRangeDto {
   @ApiProperty({
      required: true
   })
   @IsOptional()
   @IsString()
   npn: string;
   @ApiProperty({ required: false })
   @IsOptional()
   startDate: Date;
   @ApiProperty({ required: false })
   @IsOptional()
   endDate: Date;
}


export class OnlyDateRangeDto {
   @ApiProperty({ required: false })
   @IsOptional()
   startDate: Date;
   @ApiProperty({ required: false })
   @IsOptional()
   endDate: Date;
}



export class getAgentDto {
   @ApiProperty({ required: false })
   @IsOptional()
   @IsString()
   name: string;
   @ApiProperty({ required: false })
   @IsOptional()
   @IsString()
   npn: string;
}

export class npnDto {
   @ApiProperty({ required: false })
   @IsOptional()
   @IsString()
   npn: string;
}

export class npnWithDownlineDto extends OnlyDateRangeDto {
   @ApiProperty({ required: false })
   @IsOptional()
   @IsString()
   includeDownline: string;

   @ApiProperty({ required: false })
   @IsOptional()
   @IsString()
   npn: string;
}



export class DownlineDto {

   @ApiProperty({ required: false, description: "Start date for the range" })
   @IsOptional()
   @IsString()
   startDate?: string;

   @ApiProperty({ required: false, description: "End date for the range" })
   @IsOptional()
   @IsString()
   endDate?: string;

   @ApiProperty({ required: false, description: "Include downline flag" })
   @IsOptional()
   @IsString()
   includeDownline?: boolean;

   @ApiProperty({ required: false })
   @IsOptional()
   @IsString()
   npn?: string;
}
