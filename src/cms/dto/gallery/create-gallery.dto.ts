import { IsNotEmpty, IsString, IsArray, IsUrl, IsMongoId, IsOptional } from 'class-validator';

export class CreateGalleryDto {
   @IsNotEmpty()
   @IsString()
   title: string;

   @IsNotEmpty()
   @IsString()
   description: string;

   @IsOptional()
   @IsArray()
   @IsString({ each: true })
   images?: string[];

   @IsOptional()
   @IsArray()
   @IsUrl({}, { each: true })
   videoLinks?: string[];
}
