// Converted from NestJS Service
import { Request, Response } from 'express';

import { UploadTypeEnum } from '@app/contracts/enums/upload.enum';
import { EmployeeService } from './employee.service';
import { LicenseService } from './license.service';
import { PolicyService } from './policy.service';
import { CompensationService } from './compensations.service';
import { ContractingService } from './contracting.service';
import { BookOfBusinessService } from './book-of-business.service';


export class UploadService {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly licenseService: LicenseService,
    private readonly policyService: PolicyService,
    private readonly compensationService: CompensationService,
    private readonly contractingService: ContractingService,
    private readonly bookOfBusinessService: BookOfBusinessService,
  ) {}

  async upload(data: any, type: UploadTypeEnum, takeActionData?: any) {
    switch (type) {
      case UploadTypeEnum.AGENTS:
        return this.employeeService.createAgents(data);
      case UploadTypeEnum.POLICIES:
        return this.policyService.createPolicy(data);
      case UploadTypeEnum.LICENSES:
        return this.licenseService.createLicenses(data);
      case UploadTypeEnum.CONTRACTING:
        return this.contractingService.createContracting(data);
      case UploadTypeEnum.CONTRACTING_PRODUCTS:
        return this.contractingService.createContractingProducts(data);
      case UploadTypeEnum.COMPENSATIONS:
        return this.compensationService.createCompensations(data);
      case UploadTypeEnum.BOOK_OF_BUSINESS:
        return this.bookOfBusinessService.createBookOfBusiness(
          data,
          takeActionData,
        );

      default:
        throw new BadRequestException('Invalid upload type');
    }
  }
}
