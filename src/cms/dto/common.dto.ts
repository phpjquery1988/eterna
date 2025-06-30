// date range dto
import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId, IsOptional, IsDate } from "class-validator";
import { Type } from "class-transformer";
export class DateRangeDto {
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
}

// only oject id dto
export class ObjectIdDto {
   @IsMongoId()
   @ApiProperty({ required: true, example: 'ObjectId' })
   id: string;
}


// pagination dto
export class PaginationDto {
   @ApiProperty({ required: false })
   @IsOptional()
   page: number;
   @ApiProperty({ required: false })
   @IsOptional()
   limit: number;
}


export class GetAllById extends PaginationDto {
   @IsMongoId()
   @ApiProperty({ required: true, example: 'ObjectId' })
   id: string;
}