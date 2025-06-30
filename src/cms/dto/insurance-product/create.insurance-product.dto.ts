import { IsNotEmpty, IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreateInsuranceProductDto {
   @IsNotEmpty()
   @IsString()
   productName: string;

   @IsNotEmpty()
   @IsString()
   description: string;

   @IsNotEmpty()
   @IsString()
   priceRange: string;

   @IsNotEmpty()
   @IsString()
   benefits: string;

   @IsOptional()
   @IsString()
   media?: string;

   @IsOptional()
   @IsString()
   brochure?: string;

   @IsNotEmpty()
   @IsMongoId()
   agentProfile?: string;
}
