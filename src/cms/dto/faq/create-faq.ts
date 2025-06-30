import { IsNotEmpty, IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreateFAQDto {
   @IsNotEmpty()
   @IsString()
   question: string;

   @IsNotEmpty()
   @IsString()
   answer: string;

   @IsOptional()
   @IsString()
      category?: string;
}
