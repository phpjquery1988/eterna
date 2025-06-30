import { IsNotEmpty, IsString, IsUrl, IsOptional, IsMongoId } from 'class-validator';

export class CreateCallToActionDto {
   @IsNotEmpty()
   @IsString()
   primaryButtonText: string;

   @IsNotEmpty()
   @IsUrl()
   primaryButtonLink: string;

   @IsOptional()
   @IsString()
   secondaryButtonText?: string;

   @IsOptional()
   @IsUrl()
   secondaryButtonLink?: string;
}
