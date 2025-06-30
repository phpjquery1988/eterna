import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max, IsUrl, IsMongoId } from 'class-validator';

export class CreateTestimonialDto {
   @IsNotEmpty()
   @IsString()
   clientName: string;

   @IsNotEmpty()
   @IsString()
   testimonialContent: string;

   @IsOptional()
   @IsUrl()
   clientPicture?: string;

   @IsNotEmpty()
   @IsNumber()
   @Min(1)
   @Max(5)
   rating: number;

   @IsNotEmpty()
   @IsString()
   @IsMongoId()
   agentProfile: string;
}
