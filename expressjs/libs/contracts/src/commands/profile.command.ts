import {
   IsEmail,
   IsNotEmpty,
   IsOptional,
   IsString,
   MaxLength,
   MinLength,
} from 'class-validator';

export class CreateProfileCommand {
   @IsOptional()
   @MaxLength(1000)
   avatar?: string;

   @MaxLength(200)
   @IsString()
   @IsOptional()
   fullName?: string;

   @MaxLength(200)
   @IsString()
   @IsOptional()
   lastName?: string;

   @MaxLength(100)
   @MinLength(5)
   @IsString()
   @IsOptional()
   userName?: string;

   @IsNotEmpty()
   @MaxLength(100)
   @MinLength(6)
   password?: string;

   @IsOptional()
   @IsEmail()
   email?: string;

   @IsOptional()
   @MaxLength(200)
   phone?: string;

   @MaxLength(1000)
   @IsString()
   @IsOptional()
   address?: string;
}




export class CreateBaseProfileCommand {
   @MaxLength(200)
   @IsString()
   @IsOptional()
   fullName?: string;


   @MaxLength(1000)
   @IsString()
   @IsOptional()
   npn?: string;

   @IsString()
   @IsOptional()
   hash?: string;
}