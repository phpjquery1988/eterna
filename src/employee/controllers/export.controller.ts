import { Controller, Get, Query, Request, Res } from '@nestjs/common';
import { Request as ReqObj } from 'express';
import { ExportService } from '../services/export.service';
import { LicenseFilterDto } from '../dto/license.dto';
import { OnlyDateRangeDto } from '../dto/date-range.dto';
import { CompensationFilterDto } from '../dto/compensation.dto';
import { BookOfBusinessFilterDto } from '../dto/book-of-business.dto';
@Controller('v1/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('policies')
  exportAllPolicies(
    @Query() dateRangeDto: OnlyDateRangeDto,
    @Res() res: Response,
  ) {
    return this.exportService.exportAllPolicies(dateRangeDto, res);
  }

  @Get('agents')
  exportAllAgents(@Request() req: ReqObj, @Res() res: Response) {
    return this.exportService.exportAllAgents(res);
  }

  @Get('licenses')
  exportLicenses(
    @Query() licenseFilterDto: LicenseFilterDto,
    @Res() res: Response,
  ) {
    return this.exportService.exportLicenses(licenseFilterDto, res);
  }

  @Get('contractings')
  exportContractings(
    @Query() licenseFilterDto: LicenseFilterDto,
    @Res() res: Response,
  ) {
    return this.exportService.exportContractings(licenseFilterDto, res);
  }

  @Get('contracting-products')
  exportContractingProducts(
    @Query() filter: any,
    @Res() res: Response,
  ) {
    return this.exportService.exportContractingProducts(
      filter.npn, 
      filter.carrier,
      res,
    );
  }

  @Get('compensations')
  exportCompensations(
    @Query() compensationFilterDto: CompensationFilterDto,
    @Res() res: Response,
  ) {
    return this.exportService.exportCompensations(compensationFilterDto, res);
  }

  @Get('book-of-business')
  exportBookOfBusiness(
    @Query() bookOfBusinessFilterDto: BookOfBusinessFilterDto,
    @Res() res: Response,
  ) {
    return this.exportService.exportBookOfBusiness(
      bookOfBusinessFilterDto,
      res,
    );
  }
}
