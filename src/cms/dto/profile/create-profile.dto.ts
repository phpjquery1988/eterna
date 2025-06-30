import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  IsNumber,
  MinLength,
  IsMongoId,
} from 'class-validator';

export class CreateAgentProfileDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsNotEmpty()
  @MinLength(10)
  phone: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @IsOptional()
  @IsUrl({}, { each: true })
  socialMediaLinks?: string[];

  @IsOptional()
  @IsString()
  headline?: string;

  @IsString()
  npn?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsOfExperience?: number;
}
