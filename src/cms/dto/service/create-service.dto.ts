import { IsArray, IsNotEmpty, IsOptional, IsString, ArrayMinSize, IsUrl, IsMongoId } from 'class-validator';

export class CreateServiceDto {
   @IsNotEmpty()
   @IsArray()
   @ArrayMinSize(1)
   @IsString({ each: true })
   serviceCategories: string[];

   @IsNotEmpty()
   @IsString()
   detailedServices: string;

   @IsOptional()
   @IsArray()
   @IsUrl({}, { each: true })
   serviceIcons?: string[];

}
