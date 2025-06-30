import { IsNotEmpty, IsString, IsArray, IsOptional, IsUrl, IsMongoId } from 'class-validator';

export class CreatePortfolioDto {
   @IsNotEmpty()
   @IsString()
   caseStudyTitle: string;

   @IsNotEmpty()
   @IsString()
   summary: string;

   @IsNotEmpty()
   @IsString()
   outcomeImpact: string;

   @IsOptional()
   @IsArray()
   @IsUrl({}, { each: true })
   media?: string[];

   @IsNotEmpty()
   @IsMongoId()
   agentProfile: string;
}
