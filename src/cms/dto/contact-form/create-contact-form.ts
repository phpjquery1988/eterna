import { IsNotEmpty, IsString, IsArray, IsEmail, IsMongoId } from 'class-validator';

export class CreateContactFormDto {
   @IsNotEmpty()
   @IsString()
   formTitle: string;

   @IsNotEmpty()
   @IsString()
   name: string;

   @IsNotEmpty()
   @IsEmail()
   email: string;

   @IsNotEmpty()
   @IsString()
   phoneNumber: string;

   @IsNotEmpty()
   @IsArray()
   inquiryType: string[];

   @IsNotEmpty()
   @IsString()
   message: string;

   @IsNotEmpty()
   @IsString()
   submissionRedirectUrl: string;
}
