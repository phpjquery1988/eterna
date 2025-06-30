import { IsNotEmpty, IsString, IsArray, IsMongoId } from 'class-validator';

export class CreateSeoSettingsDto {
  @IsNotEmpty()
  @IsString()
  metaTitle: string;

  @IsNotEmpty()
  @IsString()
  metaDescription: string;

  @IsNotEmpty()
  @IsArray()
  keywords: string[];

  @IsNotEmpty()
  @IsString()
  customUrlSlug: string;
}
