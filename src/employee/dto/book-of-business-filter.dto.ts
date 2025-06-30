import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsDate,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ActionStatus } from '../enums/policy-status.enum';
import { PolicyStatus } from '../enums/policy-status.enum';

export class BookOfBusinessFilterDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  npn?: string;

  @ApiProperty({
    required: false,
    description:
      'Comma-separated carrier names to filter by (e.g., "carrier1,carrier2,carrier3")',
  })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  policyNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  searchTerm?: string;

  @ApiProperty({
    required: false,
    description: 'Book of business filter: Y for policies, N for underwriting',
    enum: ['Y', 'N'],
  })
  @IsOptional()
  @IsString()
  bob?: 'Y' | 'N';

  @ApiProperty({
    required: false,
    description: 'Filter by policy status',
    enum: PolicyStatus,
  })
  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;

  @ApiProperty({
    required: false,
    description: 'Filter by action status',
    enum: ActionStatus,
  })
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  @IsEnum(ActionStatus)
  actionStatus?: ActionStatus;
}

export class StatusCountsDto {
  @ApiProperty({ description: 'Number of submitted policies' })
  submitted: number;

  @ApiProperty({ description: 'Number of active policies' })
  active: number;

  @ApiProperty({ description: 'Number of lapsed policies' })
  lapsed: number;

  @ApiProperty({ description: 'Number of cancelled policies' })
  cancelled: number;

  @ApiProperty({
    description: 'Number of policies requiring take action (pending actions)',
  })
  takeAction: number;
}

export class MetricsDto {
  @ApiProperty({ description: 'Percentage of policies with pending actions' })
  pendingActionPercentage: number;

  @ApiProperty({
    description:
      'Average number of days policies spend in policy processing/underwriting',
  })
  avgDaysInPolicy: number;

  @ApiProperty({ description: 'Drop-off rate percentage' })
  dropOffRate: number;

  @ApiProperty({ description: 'Total number of policies' })
  totalPolicies: number;

  @ApiProperty({
    description: 'Policy/Take Action ratio as string (e.g., "112/150")',
  })
  conservationRatio: string;

  @ApiProperty({ description: 'Process type: underwriting or policy' })
  processType: string;
}

export class RawStatusCountDto {
  @ApiProperty({ description: 'Status name' })
  status: string;

  @ApiProperty({ description: 'Count for this status' })
  count: number;
}

export class BookOfBusinessStatusCountsResponseDto {
  @ApiProperty({
    description: 'Organized status counts',
    type: StatusCountsDto,
  })
  statusCounts: StatusCountsDto;

  @ApiProperty({ description: 'Additional metrics', type: MetricsDto })
  metrics: MetricsDto;

  @ApiProperty({
    description: 'Raw status counts from database',
    type: [RawStatusCountDto],
  })
  rawStatusCounts: RawStatusCountDto[];
}

export class AgentPerformanceDto {
  @ApiProperty({ description: 'Agent name' })
  agentName: string;

  @ApiProperty({
    description:
      'Number of policies with take actions (same logic as take action count)',
  })
  policiesWithTakeActions: number;

  @ApiProperty({
    description:
      'Number of effectuated policies that had take action tagged and have active status',
  })
  policiesEffectuated: number;

  @ApiProperty({
    description:
      'Resolution rate percentage (Policies effectuated / Policies with Take Action)',
  })
  resolutionRate: number;
}

export class AgentPerformanceResponseDto {
  @ApiProperty({
    description: 'List of agent performance data',
    type: [AgentPerformanceDto],
  })
  agents: AgentPerformanceDto[];

  @ApiProperty({ description: 'Total number of agents' })
  totalAgents: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Process type: underwriting or policy' })
  processType: string;
}

export class AgingBucketDto {
  @ApiProperty({
    description: 'Age range label (e.g., "< 2 days", "3-5 Days")',
  })
  ageRange: string;

  @ApiProperty({ description: 'Number of policies in this age range' })
  count: number;

  @ApiProperty({ description: 'Minimum days for this bucket' })
  minDays: number;

  @ApiProperty({
    description: 'Maximum days for this bucket (null for open-ended)',
  })
  maxDays: number | null;
}

export class AgingUrgencyResponseDto {
  @ApiProperty({
    description: 'Aging buckets with policy counts',
    type: [AgingBucketDto],
  })
  agingBuckets: AgingBucketDto[];

  @ApiProperty({ description: 'Total number of policies' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Process type: underwriting or policy' })
  processType: string;
}

export class TakeActionNoteDto {
  @ApiProperty({ description: 'Note ID' })
  id: string;

  @ApiProperty({ description: 'Note content/requirements' })
  content: string;

  @ApiProperty({
    description: 'Note status (New, Customer Contact, Follow-up, Resolved)',
  })
  status: string;

  @ApiProperty({ description: 'Added by (agent/user name)' })
  addedBy: string;

  @ApiProperty({ description: 'Date when note was added' })
  dateAdded: Date;

  @ApiProperty({ description: 'Subject of the note' })
  subject?: string;

  @ApiProperty({ description: 'Sender information' })
  sender?: string;
}

export class CreateTakeActionNoteDto {
  @ApiProperty({ description: 'Policy number/file number', required: true })
  @IsString()
  fileNumber: string;

  @ApiProperty({ description: 'Note content/requirements', required: true })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Bob', required: false, default: 'Y' })
  @IsString()
  bob: string;
}

export class UpdateActionStatusDto {
  @ApiProperty({
    description: 'Action status',
    required: true,
    enum: ActionStatus,
  })
  @IsEnum(ActionStatus)
  actionStatus: ActionStatus;

  @ApiProperty({ description: 'Policy number', required: true })
  @IsString()
  policyNumber: string;
}

export class TakeActionPaginationDto {
  @ApiProperty({
    required: false,
    default: 1,
    description: 'Page number (starts from 1)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    required: false,
    default: 10,
    description: 'Number of items per page',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({
    required: false,
    description: 'Book of business filter: Y for policies, N for underwriting',
    enum: ['Y', 'N'],
    default: 'Y',
  })
  @IsOptional()
  @IsString()
  bob?: 'Y' | 'N';
}

export class PaginationMetadataDto {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPreviousPage: boolean;
}

export class PolicyTakeActionResponseDto {
  @ApiProperty({ description: 'Policy number' })
  policyNumber: string;

  @ApiProperty({ description: 'Customer name' })
  customerName: string;

  @ApiProperty({ description: 'Phone number' })
  phoneNumber: string;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'Agent name' })
  agentName: string;

  @ApiProperty({ description: 'Carrier information' })
  carrier: string;

  @ApiProperty({ description: 'Policy status' })
  status: string;

  @ApiProperty({
    description: 'List of take action notes',
    type: [TakeActionNoteDto],
  })
  notes: TakeActionNoteDto[];

  @ApiProperty({ description: 'Total number of notes' })
  totalNotes: number;

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetadataDto,
  })
  pagination: PaginationMetadataDto;
}
