import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRoleEnum } from '@app/contracts';
import { Request as ReqObj } from 'express';
import { BookOfBusinessService } from '../services/book-of-business.service';
import {
  BookOfBusinessFilterDto,
  BookOfBusinessStatusCountsResponseDto,
  AgentPerformanceResponseDto,
  AgingUrgencyResponseDto,
  PolicyTakeActionResponseDto,
  CreateTakeActionNoteDto,
  TakeActionPaginationDto,
  UpdateActionStatusDto,
} from '../dto/book-of-business-filter.dto';
import {
  DateRangeDto,
  npnWithDownlineDto,
} from '../dto/date-range.dto';
import { performanceStatsDto } from '../dto/stats.dto';

@Controller('v1/book-of-business')
@ApiTags('book-of-business')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class BookOfBusinessController {
  constructor(private readonly bookOfBusinessService: BookOfBusinessService) {}

  @Get('data')
  @ApiTags('book-of-business')
  @ApiResponse({
    status: 200,
    description:
      'Returns paginated policy data with optional take action information. Supports bob filter (Y for book of business policies, N for underwriting policies). Includes policy details, carrier information, and latest take action status when available. Supports filtering by policy status (Submitted, Active, Lapsed, Cancelled) and action status (pending, completed, rejected).',
  })
  getData(@Query() bookOfBusinessFilterDto: BookOfBusinessFilterDto) {
    // Use the bob parameter from the DTO, default to 'Y' (policies) if not provided
    const bobValue = bookOfBusinessFilterDto.bob || 'Y';
    return this.bookOfBusinessService.getBookOfBusinessPolicy(
      bookOfBusinessFilterDto,
      bobValue,
    );
  }

  @Get('status-counts')
  @ApiTags('book-of-business')
  @ApiResponse({
    status: 200,
    description:
      'Returns consistent status counts and metrics for both book of business and underwriting policies. Supports bob filter (Y for book of business policies, N for underwriting policies). Includes counts for the 4 valid statuses: Submitted, Active, Lapsed, and Cancelled policies, plus take action count. Additional metrics include pending action percentage, average days in processing, and drop-off rates. Excludes rejected policies from submitted counts.',
    type: BookOfBusinessStatusCountsResponseDto,
  })
  getStatusCounts(
    @Query() bookOfBusinessFilterDto: BookOfBusinessFilterDto,
  ): Promise<BookOfBusinessStatusCountsResponseDto> {
    return this.bookOfBusinessService.getBookOfBusinessStatusCounts(
      bookOfBusinessFilterDto,
    );
  }

  @Get('agent-performance')
  @ApiTags('book-of-business')
  @ApiResponse({
    status: 200,
    description:
      'Returns agent performance data including policies with take actions, effectuated policies, and resolution rates. Supports bob filter (Y for book of business policies, N for underwriting policies). Policies with Take Action uses same logic as take action count. Policies effectuated are those with take actions and active status. Resolution rate is calculated as Policies effectuated / Policies with Take Action. Excludes rejected policies.',
    type: AgentPerformanceResponseDto,
  })
  getAgentPerformance(
    @Query() bookOfBusinessFilterDto: BookOfBusinessFilterDto,
  ): Promise<AgentPerformanceResponseDto> {
    return this.bookOfBusinessService.getAgentPerformance(
      bookOfBusinessFilterDto,
    );
  }

  @Get('aging-urgency')
  @ApiTags('book-of-business')
  @ApiResponse({
    status: 200,
    description:
      'Returns aging and urgency data showing policy counts by age ranges (< 2 days, 3-5 Days, 6-10 days, >10 Days). Supports bob filter (Y for book of business policies, N for underwriting policies). Only includes policies that are in Take Action in Underwriting/Policy processing that are Pending. Age is calculated as average days open from today date minus the first reported Take action date.',
    type: AgingUrgencyResponseDto,
  })
  getAgingUrgency(
    @Query() bookOfBusinessFilterDto: BookOfBusinessFilterDto,
  ): Promise<AgingUrgencyResponseDto> {
    return this.bookOfBusinessService.getAgingUrgency(bookOfBusinessFilterDto);
  }

  @Get('policy/:policyNumber/take-action')
  @ApiTags('book-of-business')
  @ApiResponse({
    status: 200,
    description:
      'Returns policy details with paginated take action notes filtered by bob type (Y for book of business policies, N for underwriting policies). Used when opening the take action popup for a specific policy.',
    type: PolicyTakeActionResponseDto,
  })
  getPolicyTakeActionDetails(
    @Param('policyNumber') policyNumber: string,
    @Query() paginationDto: TakeActionPaginationDto,
  ): Promise<PolicyTakeActionResponseDto> {
    return this.bookOfBusinessService.getPolicyTakeActionDetails(
      policyNumber,
      paginationDto.page,
      paginationDto.limit,
      paginationDto.bob || 'Y',
    );
  }

  @Post('take-action/note')
  @ApiTags('book-of-business')
  @ApiResponse({
    status: 201,
    description:
      'Creates a new take action note for a policy. Sender information is extracted from the authentication token.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        noteId: { type: 'string' },
      },
    },
  })
  createTakeActionNote(
    @Body() createNoteDto: CreateTakeActionNoteDto,
    @Request() req: ReqObj,
  ): Promise<{ message: string; noteId: string }> {
    return this.bookOfBusinessService.createTakeActionNote(
      createNoteDto,
      req.user,
    );
  }

  @Put('action-status')
  @ApiTags('book-of-business')
  @ApiResponse({
    status: 200,
    description:
      'Updates the action status of a policy (pending, completed, rejected). Used for take action disposition dropdown.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  updateActionStatus(
    @Body() updateActionStatusDto: UpdateActionStatusDto,
  ): Promise<{ message: string }> {
    return this.bookOfBusinessService.updateActionStatus(updateActionStatusDto);
  }

  // New Dashboard Endpoints for Book of Business

  @Get('supervisor/detail')
  @ApiTags('book-of-business-dashboard')
  @ApiResponse({
    status: 200,
    description: 'Get supervisor detail for book of business policies',
  })
  getSupervisorDetail(@Query() dateRangeDto: DateRangeDto, @Request() req: ReqObj) {
    const user = req.user as any;
    const isAdmin = user.role === 'admin';
    const npn = dateRangeDto.npn;
    const search = '' + req.query.search;
    return this.bookOfBusinessService.getEmployeeHierarchy(
      npn,
      dateRangeDto,
      isAdmin,
      search,
    );
  }

  @Get('total/all')
  @ApiTags('book-of-business-dashboard')
  @ApiResponse({
    status: 200,
    description: 'Get total statistics for book of business policies by supervisor',
  })
  getTotalAll(@Query() dateRangeDto: DateRangeDto, @Request() req: ReqObj) {
    const user = req.user as any;
    const isAdmin = user.role === 'admin';
    const npn = dateRangeDto.npn;
    return this.bookOfBusinessService.getPolicyStatsBySupervisor(
      npn,
      dateRangeDto,
      isAdmin,
    );
  }

  @Get('persistency')
  @ApiTags('book-of-business-dashboard')
  @ApiResponse({
    status: 200,
    description: 'Get persistency data for book of business policies',
  })
  async getPersistency(
    @Query() npnWithDownlineDto: npnWithDownlineDto,
    @Request() req: ReqObj,
  ) {
    const user = req.user as any;
    const isIncludeDownline = npnWithDownlineDto.includeDownline === 'true';
    const isAdmin = user.role === 'admin';
    const npn = npnWithDownlineDto.npn;
    const startDate = npnWithDownlineDto?.startDate?.toString();
    const endDate = npnWithDownlineDto?.endDate?.toString();
    return this.bookOfBusinessService.calculatePersistency(
      npn,
      isIncludeDownline,
      isAdmin,
      startDate,
      endDate,
    );
  }

  @Get('chargeback')
  @ApiTags('book-of-business-dashboard')
  @ApiResponse({
    status: 200,
    description: 'Get chargeback data for book of business policies',
  })
  async getChargeback(
    @Query() dateRangeDto: DateRangeDto,
    @Request() req: ReqObj,
  ) {
    const user = req.user as any;
    const isAdmin = user.role === 'admin';
    const npn = dateRangeDto.npn;
    return this.bookOfBusinessService.calculateChargebacksAgent(
      npn,
      dateRangeDto,
      isAdmin,
    );
  }

  @Get('product-wise-total-premium')
  @ApiTags('book-of-business-dashboard')
  @ApiResponse({
    status: 200,
    description: 'Get product-wise total premium for book of business policies',
  })
  productWiseTotalPremium(@Query() query: any) {
    return this.bookOfBusinessService.productWiseTotalPremium(query);
  }

  @Get('product-wise-total-commission-premium')
  @ApiTags('book-of-business-dashboard')
  @ApiResponse({
    status: 200,
    description: 'Get product-wise total commission premium for book of business policies',
  })
  productWiseTotalCommissionPremium(@Query() query: any) {
    return this.bookOfBusinessService.productWiseCommissionPremium(query);
  }

  @Get('performance/stats')
  @ApiTags('book-of-business-dashboard')
  @ApiResponse({
    status: 200,
    description: 'Get performance stats for book of business policies including total policies, active policies, premium amounts, and persistency rates for each agent in the hierarchy',
  })
  async getPerformanceStats(
    @Query() performanceStats: performanceStatsDto,
    @Request() req: ReqObj,
  ) {
    const user = req.user as any;
    const isAdmin = user.role === 'admin';
    const npn = performanceStats.npn;
    return this.bookOfBusinessService.getPerformanceStats(
      performanceStats,
      isAdmin,
      npn,
    );
  }
}
