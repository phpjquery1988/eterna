import { IsNotEmpty, IsString, IsOptional, IsArray, IsDate, IsMongoId, IsUrl } from 'class-validator';

export class CreateBlogDto {
   @IsNotEmpty()
   @IsString()
   blogTitle: string;

   @IsNotEmpty()
   @IsString()
   blogContent: string;

   @IsNotEmpty()
   publishDate: string;

   @IsOptional()
   @IsArray()
   @IsString({ each: true })
   tags?: string[];

   @IsOptional()
   @IsUrl()
   featuredImage?: string;
}
