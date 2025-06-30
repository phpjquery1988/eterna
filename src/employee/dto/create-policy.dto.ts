import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class PolicyDto {
  @ApiProperty({
    description: 'The contact name associated with the policy',
    required: false,
  })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiProperty({
    description: 'The email associated with the policy',
    required: false,
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'The phone number associated with the policy',
    required: false,
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    description: 'The source from where the policy was generated',
    required: false,
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiProperty({
    description: 'The date when the policy was added',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  dateAdded?: Date;

  @ApiProperty({
    description: 'The date when the policy was sold',
    required: false,
  })
  @IsOptional()
  dateSold?: any;

  @ApiProperty({
    description: 'The date when the policy was terminated',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  terminatedDate?: Date;

  @ApiProperty({ description: 'The type of the policy', required: false })
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'The effective date of the policy',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  effectiveDate?: Date;

  @ApiProperty({
    description: 'Indicates whether the policy is terminated',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  terminated?: boolean;

  @ApiProperty({
    description: 'The location associated with the policy',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    description: 'The product associated with the policy',
    required: false,
  })
  @IsString()
  @IsOptional()
  product?: string;

  @ApiProperty({
    description: 'The annual premium for the policy',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  annualPremium?: number;

  @ApiProperty({
    description: 'The commission premium for the policy',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  commissionPremium?: number;

  @ApiProperty({ description: 'The carrier policy status', required: false })
  @IsString()
  @IsOptional()
  carrierPolicyStatus?: string;

  @ApiProperty({
    description: 'The consolidated policy status',
    required: false,
  })
  @IsString()
  @IsOptional()
  consolidatedPolicyStatus?: string;

  @ApiProperty({ description: 'The carrier of the policy', required: false })
  @IsString()
  @IsOptional()
  carrier?: string;

  @ApiProperty({ description: 'The policy number', required: false })
  @IsString()
  @IsOptional()
  policyNo?: string;

  @ApiProperty({
    description: 'The NPN associated with the policy',
    required: false,
  })
  @IsString()
  @IsOptional()
  npn?: string;

  @ApiProperty({
    description: 'The agent associated with the policy',
    required: false,
  })
  @IsString()
  @IsOptional()
  agent?: string;

  @ApiProperty({
    description: 'The type of agent associated with the policy',
    required: false,
  })
  @IsString()
  @IsOptional()
  agentType?: string;

  @ApiProperty({ description: "The agent's upline", required: false })
  @IsString()
  @IsOptional()
  agentsUpline?: string;

  @ApiProperty({ description: "The agent's upline NPN", required: false })
  @IsString()
  @IsOptional()
  agentsUplineNpn?: string;

  @ApiProperty({
    description: 'The expected commission for the policy',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  expectedCommission?: number;

  @ApiProperty({ description: 'The status of the policy', required: false })
  @IsString()
  @IsOptional()
  policyStatus?: string;

  @ApiProperty({
    description: 'The commission status of the policy',
    required: false,
  })
  @IsString()
  @IsOptional()
  commissionStatus?: string;

  @ApiProperty({
    description: 'The count of the policy',
    required: false,
  })
  @IsString()
  @IsOptional()
  policyCount?: number;

  @ApiProperty({
    description: 'export date of data',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  exportdt?: Date;

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
