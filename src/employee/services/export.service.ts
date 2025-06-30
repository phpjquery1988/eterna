import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Policy } from '../entities/policy.schema';
import * as XLSX from 'xlsx';
import { DateService } from './date.service';
import { Employee } from '../entities/employee.schema';
import { License } from '../entities/license.schema';
import { LicenseFilterDto } from '../dto/license.dto';
import { EmployeeService } from './employee.service';
import { OnlyDateRangeDto } from '../dto/date-range.dto';
import { Compensation } from '../entities/compensation.schema';
import { CompensationFilterDto } from '../dto/compensation.dto';
import { Contracting } from '../entities/contracting.schema';
import { ContractingProducts } from '../entities/contracting-products.schema';
import { BookOfBusinessFilterDto } from '../dto/book-of-business-filter.dto';
import { BookOfBusinessPolicy } from '../entities/book-of-business-policy.schema';
import { BookOfBusinessTakeAction } from '../entities/book-of-business-take-action.schema';
@Injectable()
export class ExportService {
  AgentContractingStatusMapping = {
    1: 'Agent DocuSign Pending',
    2: 'DocuSign Completed',
    3: 'Contract Submitted',
    4: 'Rejected',
    5: 'Action Needed',
    6: 'Ready to Sell (All Policies)',
    7: 'Ready to Sell (Partial)',
  };
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<Employee>,
    @InjectModel(Policy.name)
    private readonly policyModel: Model<Policy>,
    @InjectModel(License.name)
    private readonly licenseModel: Model<License>,
    @InjectModel(Contracting.name)
    private readonly contractingModel: Model<Contracting>,
    private readonly dateService: DateService,
    private readonly employeeService: EmployeeService,
    @InjectModel(Compensation.name)
    private readonly compensationModel: Model<Compensation>,
    @InjectModel(ContractingProducts.name)
    private readonly contractingProductsModel: Model<ContractingProducts>,

    @InjectModel(BookOfBusinessPolicy.name)
    private readonly bookOfBusinessPolicyModel: Model<BookOfBusinessPolicy>,

    @InjectModel(BookOfBusinessTakeAction.name)
    private readonly bookOfBusinessTakeActionModel: Model<BookOfBusinessTakeAction>,

  ) {}

  toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  async exportAllPolicies(dateRangeDto: OnlyDateRangeDto, res) {
    let queryStartDate = dateRangeDto.startDate
      ? this.dateService.getStartDate(dateRangeDto.startDate.toString())
      : null;
    let queryEndDate = dateRangeDto.endDate
      ? this.dateService.getEndDate(dateRangeDto.endDate.toString())
      : null;

    const matchObject: any = {};
    if (queryStartDate && queryEndDate) {
      matchObject.dateSold = {
        $gte: new Date(queryStartDate),
        $lte: new Date(queryEndDate),
      };
    }
    const policiesRecords = await this.policyModel.find(matchObject);

    const policies = policiesRecords.map((p) => {
      console.log(p);
      const json: any = p.toJSON();
      const data: any = {
        id: p._id.toString(),
        ...json,
        dateAdded: json.dateAdded
          ? this.dateService.getDateString(json.dateAdded)
          : null,
        dateSold: json.dateSold
          ? this.dateService.getDateString(json.dateSold)
          : null,
        effectiveDate: json.effectiveDate
          ? this.dateService.getDateString(json.effectiveDate)
          : null,
        createdAt: json.createdAt
          ? this.dateService.getDateString(json.createdAt)
          : null,
        updatedAt: json.updatedAt
          ? this.dateService.getDateString(json.updatedAt)
          : null,
        terminatedDate: json.terminatedDate
          ? this.dateService.getDateString(json.terminatedDate)
          : null,
        terminated: json.terminated ? 1 : 0,
        exportdt: json.exportdt
          ? this.dateService.getDateString(json.exportdt)
          : null,
        isDeleted: 0,
      };

      delete data._id;
      delete data.__v;

      const snakeCasedData = Object.keys(data).reduce((acc, key) => {
        const snakeKey = this.toSnakeCase(key);
        acc[snakeKey] = data[key];
        return acc;
      }, {} as any);

      return snakeCasedData;
    });

    const worksheet = XLSX.utils.json_to_sheet(policies);

    // Create a new workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Policies');

    // Write workbook to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=policies.xlsx');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // Send the Excel file
    res.send(buffer);
  }

  async exportAllAgents(res) {
    const employeesRecords = await this.employeeModel.find({});

    const agents = employeesRecords.map((p) => {
      console.log(p);
      const json: any = p.toJSON();
      const data: any = {
        id: p._id.toString(),
        ...json,
        eftdt: json.eftdt ? this.dateService.getDateString(json.eftdt) : null,
        enddt: json.enddt ? this.dateService.getDateString(json.enddt) : null,
        createdAt: json.createdAt
          ? this.dateService.getDateString(json.createdAt)
          : null,
        updatedAt: json.updatedAt
          ? this.dateService.getDateString(json.updatedAt)
          : null,
        otherPhones:
          json.otherPhones && json.otherPhones.length
            ? json.otherPhones.join(',')
            : '',
        hrnpn: json.hrnpn ?? '',
        isDeleted: 0,
      };

      delete data._id;
      delete data.__v;
      delete data.batchId;

      const snakeCasedData = Object.keys(data).reduce((acc, key) => {
        const snakeKey = this.toSnakeCase(key);
        acc[snakeKey] = data[key];
        return acc;
      }, {} as any);

      return snakeCasedData;
    });

    const worksheet = XLSX.utils.json_to_sheet(agents);

    // Create a new workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agents');

    // Write workbook to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=agents.xlsx');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // Send the Excel file
    res.send(buffer);
  }

  async exportLicenses(licenseFilterDto: LicenseFilterDto, res) {
    licenseFilterDto.agentName = licenseFilterDto.agentName || '';

    const stageNumbers = licenseFilterDto.stageNumbers
      ? licenseFilterDto.stageNumbers.split(',').map((s) => Number(s))
      : [];

    const carriers = licenseFilterDto.carriers && licenseFilterDto.carriers !== 'null'
      ? licenseFilterDto.carriers.split(',').map(c => c.trim()).filter(c => c)
      : [];

    const matchConditions: any = {};

    if (licenseFilterDto.agentName) {
      matchConditions.agentName = {
        $regex: licenseFilterDto.agentName,
        $options: 'i',
      };
    }

    licenseFilterDto.npn = licenseFilterDto.npn ? licenseFilterDto.npn : null;

    if (licenseFilterDto.npn) {
      const npns = await this.employeeService.getAllDownlines(
        licenseFilterDto.npn,
      );
      matchConditions.uplineNpn = { $in: npns };
    }

    if (carriers.length) {
      matchConditions.$or = [
        { carrier: { $in: carriers } },
        { carrier: null },
        { carrier: '' },
      ];
    }

    if (stageNumbers.length) {
      matchConditions.stageNumber = { $in: stageNumbers };
    }

    const licenseRecords = await this.licenseModel.find(matchConditions);

    const licenses = licenseRecords.map((p) => {
      const json: any = p.toJSON();
      const data: any = {
        id: p._id.toString(),
        ...json,
        createdAt: json.createdAt
          ? this.dateService.getDateString(json.createdAt)
          : null,
        updatedAt: json.updatedAt
          ? this.dateService.getDateString(json.updatedAt)
          : null,
        states: json.states && json.states.length ? json.states.join(',') : '',
        isDeleted: 0,
      };

      delete data._id;
      delete data.__v;

      const snakeCasedData = Object.keys(data).reduce((acc, key) => {
        const snakeKey = this.toSnakeCase(key);
        acc[snakeKey] = data[key];
        return acc;
      }, {} as any);

      return snakeCasedData;
    });

    const worksheet = XLSX.utils.json_to_sheet(licenses);

    // Create a new workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Licenses');

    // Write workbook to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=licenses.xlsx');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // Send the Excel file
    res.send(buffer);
  }

  private async getContractingExportData(licenseFilterDto: LicenseFilterDto) {
    licenseFilterDto.agentName = licenseFilterDto.agentName || '';
    const isUser = Boolean(licenseFilterDto.isUser);
    const stageNumber = licenseFilterDto.stageNumber
      ? Number(licenseFilterDto.stageNumber)
      : null;

    const carriers = licenseFilterDto.carriers && licenseFilterDto.carriers !== 'null'
      ? licenseFilterDto.carriers.split(',').map(c => c.trim()).filter(c => c)
      : [];

    const matchConditions: any = {};

    if (stageNumber) {
      if (stageNumber === 1) {
        matchConditions.docuSign = null;
      }
      if (stageNumber === 2) {
        matchConditions.docuSign = { $ne: null };
      }
      if (stageNumber === 3) {
        matchConditions.contractsSubmitted = { $ne: null };
      }
      if (stageNumber >= 4) {
        matchConditions.carriers = {
          $elemMatch: {
            stageNumber: stageNumber,
          },
        };
      }
    }

    if (licenseFilterDto.agentName) {
      matchConditions.agentName = {
        $regex: licenseFilterDto.agentName,
        $options: 'i',
      };
    }

    licenseFilterDto.npn = licenseFilterDto.npn ? licenseFilterDto.npn : null;

    if (licenseFilterDto.npn) {
      const npns = await this.employeeService.getAllDownlines(
        licenseFilterDto.npn,
      );
      matchConditions.uplineNpn = { $in: npns };
    }

    if (carriers.length) {
      matchConditions.$or = [
        { carrier: { $in: carriers } },
        { carrier: null },
        { carrier: '' },
      ];
    }

    const contractingRecords =
      await this.contractingModel.find(matchConditions);

    return contractingRecords.map((p) => {
      const json: any = p.toJSON();
      const data: any = {
        id: p._id.toString(),
        isDeleted: 0,
        ...json,
        email: json.emails && json.emails.length ? json.emails.join(',') : '',
        createdAt: json.createdAt
          ? this.dateService.getDateString(json.createdAt)
          : null,
        updatedAt: json.updatedAt
          ? this.dateService.getDateString(json.updatedAt)
          : null,
      };

      json.carriers.forEach((carrier) => {
        if (carrier.carrier) {
          data[carrier.carrier.toLowerCase()] = isUser
            ? this.AgentContractingStatusMapping[Number(carrier.stageNumber)]
            : carrier.stageNumber;
          data[`${carrier.carrier.toLowerCase()} #`] = carrier.carrierNumber;
        }
      });

      delete data._id;
      delete data.__v;
      delete data.emails;
      delete data.carriers;

      const snakeCasedData = Object.keys(data).reduce((acc, key) => {
        const snakeKey = this.toSnakeCase(key);
        acc[snakeKey] = data[key];
        return acc;
      }, {} as any);

      return snakeCasedData;
    });
  }

  private async getContractingProductsExportData(
    licenseFilterDto: LicenseFilterDto,
  ) {
    licenseFilterDto.agentName = licenseFilterDto.agentName || '';

    const carriers = licenseFilterDto.carriers && licenseFilterDto.carriers !== 'null'
      ? licenseFilterDto.carriers.split(',').map(c => c.trim()).filter(c => c)
      : [];

    const matchConditions: any = {};
    if (licenseFilterDto.npns) {
      matchConditions.npn = { $in: licenseFilterDto.npns };
    }
    if (carriers.length) {
      matchConditions.carrier = { $in: carriers };
    }
    const contractingProductsRecords =
      await this.contractingProductsModel.find(matchConditions);

    return contractingProductsRecords.map((p) => {
      const json: any = p.toJSON();
      const data: any = {
        id: p._id.toString(),
        ...json,
        createdAt: json.createdAt
          ? this.dateService.getDateString(json.createdAt)
          : null,
        updatedAt: json.updatedAt
          ? this.dateService.getDateString(json.updatedAt)
          : null,
        isDeleted: 0,
      };

      delete data._id;
      delete data.__v;

      const snakeCasedData = Object.keys(data).reduce((acc, key) => {
        const snakeKey = this.toSnakeCase(key);
        acc[snakeKey] = data[key];
        return acc;
      }, {} as any);

      return snakeCasedData;
    });
  }

  async exportContractings(licenseFilterDto: LicenseFilterDto, res) {
    const contractings = await this.getContractingExportData(licenseFilterDto);

    const uniqueExportNpn = [...new Set(contractings.map((c) => c.npn))];
    console.log(uniqueExportNpn);
    licenseFilterDto.npns = uniqueExportNpn;
    const contractingProducts =
      await this.getContractingProductsExportData(licenseFilterDto);

    const exportNpnProducts = contractingProducts.map((c) => c.npn);
    const uniqueExportNpnProducts = [...new Set(exportNpnProducts)];

    const contractingsWorksheet = XLSX.utils.json_to_sheet(contractings);
    const contractingProductsWorksheet =
      XLSX.utils.json_to_sheet(contractingProducts);

    // Create a new workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      contractingsWorksheet,
      'Contractings',
    );

    XLSX.utils.book_append_sheet(
      workbook,
      contractingProductsWorksheet,
      'Contracting Products',
    );

    // Write workbook to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=contractings.xlsx',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // Send the Excel file
    res.send(buffer);
  }

  async exportContractingProducts(npn: string, carrier: string, res) {
    const matchConditions: any = {};
    if (npn) {
      matchConditions.npn = npn;
    }
    if (carrier) {
      matchConditions.carrier = carrier;
    }

    const contractingProductsRecords =
      await this.contractingProductsModel.find(matchConditions);

    const contractingProducts = contractingProductsRecords.map((p) => {
      const json: any = p.toJSON();
      const data: any = {
        id: p._id.toString(),
        ...json,
        createdAt: json.createdAt
          ? this.dateService.getDateString(json.createdAt)
          : null,
        updatedAt: json.updatedAt
          ? this.dateService.getDateString(json.updatedAt)
          : null,
        isDeleted: 0,
      };

      delete data._id;
      delete data.__v;

      const snakeCasedData = Object.keys(data).reduce((acc, key) => {
        const snakeKey = this.toSnakeCase(key);
        acc[snakeKey] = data[key];
        return acc;
      }, {} as any);

      return snakeCasedData;
    });

    const worksheet = XLSX.utils.json_to_sheet(contractingProducts);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contracting Products');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=contracting_products.xlsx',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // Send the Excel file
    res.send(buffer);
  }

  async exportCompensations(compensationFilterDto: CompensationFilterDto, res) {
    compensationFilterDto.product = compensationFilterDto.product || '';
    const matchConditions: any = {};

    if (compensationFilterDto.product) {
      matchConditions.product = {
        $regex: compensationFilterDto.product,
        $options: 'i',
      };
    }

    if (compensationFilterDto.carrier && compensationFilterDto.carrier !== 'null' && compensationFilterDto.carrier.trim()) {
      const carrierArray = compensationFilterDto.carrier.split(',').map(c => c.trim()).filter(c => c);
      if (carrierArray.length > 0) {
        matchConditions.carrier = { $in: carrierArray };
      }
    }

    if (compensationFilterDto.type) {
      matchConditions.type = compensationFilterDto.type;
    }

    const compensationRecords =
      await this.compensationModel.find(matchConditions);

    const compensations = compensationRecords.map((p) => {
      const json: any = p.toJSON();
      const data: any = { ...json };

      delete data._id;
      delete data.__v;
      delete data.createdAt;
      delete data.updatedAt;

      const snakeCasedData = Object.keys(data).reduce((acc, key) => {
        const snakeKey = this.toSnakeCase(key);
        acc[snakeKey] = data[key];
        return acc;
      }, {} as any);

      return snakeCasedData;
    });

    let keys = [];

    if (compensations && compensations.length) {
      keys = Object.keys(compensations[0])
        .filter((a) => !isNaN(Number(a)))
        .map((a) => Number(a))
        .sort((a, b) => b - a)
        .map((a) => a.toString());
    }

    const worksheet = XLSX.utils.json_to_sheet(compensations, {
      header: ['carrier', 'type', 'product', ...keys],
    });

    // Create a new workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Compensations');

    // Write workbook to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=compensations.xlsx',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // Send the Excel file
    res.send(buffer);
  }

  async exportBookOfBusiness(filter: BookOfBusinessFilterDto, res) {
    const matchConditions: any = {};

    if (filter.startDate || filter.endDate) {
      matchConditions.receivedDate = {};
      
      if (filter.startDate) {
        const startDateString = this.dateService.getDateString(filter.startDate);
        const startDateUS = this.dateService.getStartDate(startDateString);
        matchConditions.receivedDate.$gte = startDateUS;
      }
      
      if (filter.endDate) {
        const endDateString = this.dateService.getDateString(filter.endDate);
        const endDateUS = this.dateService.getEndDate(endDateString);
        matchConditions.receivedDate.$lte = endDateUS;
      }
    }

    if (filter.search) {
      matchConditions.$or = [
        { agentName: { $regex: filter.search, $options: 'i' } },
        { client: { $regex: filter.search, $options: 'i' } },
        { policyNumber: { $regex: filter.search, $options: 'i' } }
      ];
    }

    // Get policies data
    const policiesResult = await this.bookOfBusinessPolicyModel.find(matchConditions);

    // Get take actions data
    const takeActionsResult = await this.bookOfBusinessTakeActionModel.find(matchConditions);

    // Transform data for Policy Detail sheet
    const policyDetails = policiesResult.map(policy => {
      const json: any = policy.toJSON();
      const data: any = {
        id: policy._id.toString(),
        ...json,
        receivedDate: json.receivedDate
          ? this.dateService.getDateString(json.receivedDate)
          : null,
        activityDate: json.activityDate
          ? this.dateService.getDateString(json.activityDate)
          : null,
        issueDate: json.issueDate
          ? this.dateService.getDateString(json.issueDate)
          : null,
          
        createdAt: json.createdAt
          ? this.dateService.getDateString(json.createdAt)
          : null,
        updatedAt: json.updatedAt
          ? this.dateService.getDateString(json.updatedAt)
          : null,
        isDeleted: 0,
      };

      delete data._id;
      delete data.__v;

      const snakeCasedData = Object.keys(data).reduce((acc, key) => {
        const snakeKey = this.toSnakeCase(key);
        acc[snakeKey] = data[key];
        return acc;
      }, {} as any);

      return snakeCasedData;
    });

    // Transform data for Take Action sheet
    const takeAction = takeActionsResult.map(action => {
      const json: any = action.toJSON();
      const data: any = {
        id: action._id.toString(),
        ...json,
        effectiveDate: json.effectiveDate
          ? this.dateService.getDateString(json.effectiveDate)
          : null,
        closeDate: json.closeDate
          ? this.dateService.getDateString(json.closeDate)
          : null,
        emailReceived: json.emailReceived || '',
        createdAt: json.createdAt
          ? this.dateService.getDateString(json.createdAt)
          : null,
        updatedAt: json.updatedAt
          ? this.dateService.getDateString(json.updatedAt)
          : null,
        isDeleted: 0,
      };

      const snakeCasedData = Object.keys(data).reduce((acc, key) => {
        const snakeKey = this.toSnakeCase(key);
        acc[snakeKey] = data[key];
        return acc;
      }, {} as any);

      return snakeCasedData;
    });

    // Create workbook with two sheets
    const workbook = XLSX.utils.book_new();
    
    // Add Policy Detail sheet
    const policyDetailsWorksheet = XLSX.utils.json_to_sheet(policyDetails);
    XLSX.utils.book_append_sheet(workbook, policyDetailsWorksheet, 'Policy Detail');
    
    // Add Take Action sheet
    const takeActionWorksheet = XLSX.utils.json_to_sheet(takeAction);
    XLSX.utils.book_append_sheet(workbook, takeActionWorksheet, 'Take Action');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="book-of-business.xlsx"',
      'Content-Length': buffer.length,
    });
    
    res.send(buffer);
  }
}
