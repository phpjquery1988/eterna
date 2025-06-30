import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
  Allow,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'The NPN (National Producer Number) of the employee',
  })
  @IsString()
  @IsNotEmpty()
  npn: string;

  @ApiProperty({ description: 'The name of the agent' })
  @IsString()
  @IsNotEmpty()
  agent: string;

  @ApiProperty({ description: 'Password of user' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ description: 'The phone number of the agent' })
  @IsString()
  phone: string;

  @ApiProperty({
    description: 'The email of the employee',
    example: 'employee@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The type of agent', example: 'Direct Agent' })
  @IsString()
  @IsNotEmpty()
  agentType: string;

  @ApiProperty({
    description: 'The effective date of the agent',
    type: String,
    format: 'date',
  })
  @IsDateString()
  @IsNotEmpty()
  eftdt: Date;

  @ApiProperty({
    description: 'The end date of the agent, if any',
    type: String,
    format: 'date',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  enddt?: Date;

  @ApiProperty({ description: 'The status of the agent', example: 'Active' })
  @IsString()
  @IsNotEmpty()
  agentStatus: string;

  @ApiProperty({ description: 'The upline agent', required: false })
  @IsString()
  @IsOptional()
  agentsUpline: string;

  @ApiProperty({ description: 'The upline NPN', required: false })
  @IsString()
  @IsOptional()
  agentsUplineNpn: string;

  @ApiProperty({ description: 'The HR NPN', required: false })
  @IsString()
  @IsOptional()
  hrnpn: string;

  @ApiProperty({ description: 'Other phone numbers to login', required: false })
  @IsString()
  @IsOptional()
  otherPhones?: string | string[];

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  isDeleted: number;

  @IsOptional()
  @ApiProperty({
    required: false,
  })
  id: string;
}
