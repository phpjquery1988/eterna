// Converted from NestJS Service
import { Request, Response } from 'express';

import { Model } from 'mongoose';
import { Contracting } from '../entities/contracting.schema';
import { DateService } from './date.service';
import { LicenseFilterDto } from '../dto/license.dto';
import { EmployeeService } from './employee.service';
import { Carrier } from '../entities/carrier.schema';
import { ContractingProducts } from '../entities/contracting-products.schema';
import { toScreamingSnakeCase } from '../services/helper';


export class ContractingService {
  private requiredColumns: string[] = [
    'id',
    'isDeleted',
    'agentName',
    'npn',
    'uplineName',
    'uplineNpn',
    'email',
    'jotform',
    'docuSign',
    'contractsSubmitted',
  ];

  private requiredColumnsProducts: string[] = [
    'id',
    'isDeleted',
    'agentName',
    'npn',
    'carrier',
    'product',
    'status',
    'effDate',
  ];

  constructor(
    
    private contractingModel: Model<Contracting>,
    
    private contractingProductsModel: Model<ContractingProducts>,
    
    private carrierModel: Model<Carrier>,
    private dateService: DateService,
    private employeeService: EmployeeService,
  ) {}

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  private transformContractingData(data: any) {
    // First, extract the required fields
    const requiredData = {};
    this.requiredColumns.forEach((column) => {
      requiredData[column] = data[column];
    });

    // Get all non-required columns and transform them
    const entries = Object.entries(data)
      .filter(([key]) => !this.requiredColumns.includes(key))
      .map(([key, value]) => ({
        key: toScreamingSnakeCase(key),
        value: value?.toString() || '',
      }));

    // Group carriers with their numbers
    const carriers = entries.reduce((acc, curr) => {
      if (!curr.key.endsWith('_#')) {
        const carrier = curr.key;
        const numberField = entries.find((e) => e.key === `${curr.key}_#`);

        if (curr.value) {
          // Only include if carrier has a value
          acc.push({
            carrier,
            carrierNumber: numberField ? numberField.value : '',
            stageNumber: parseInt(curr.value) || 0,
          });
        }
      }
      return acc;
    }, []);

    return {
      ...requiredData,
      carriers,
    };
  }

  async createContracting(contractingDtos: any[]) {
    if (!contractingDtos.length || !contractingDtos[0]) {
      throw new BadRequestException('No data provided');
    }

    const columnNames = Object.keys(contractingDtos[0]);

    // Find missing columns: present in "requiredColumns" but not in "columns"
    const missingColumns = this.requiredColumns.filter(
      (col) => !columnNames.includes(col),
    );
    if (missingColumns.length) {
      throw new BadRequestException(
        `missing columns: ${missingColumns.map(this.toSnakeCase).join(',')}`,
      );
    }

    try {
      const transformedData = contractingDtos
        .map((dto) => this.transformContractingData(dto))
        .map((dto: any) => {
          dto.emails = dto.email
            .split(',')
            .map((email: string) => email.trim());
          delete dto.email;
          return dto;
        });

      const bulkOperations = transformedData.map((contracting) => {
        // When an ID is provided
        if (contracting.id) {
          // Delete the record if isDeleted is 1
          if (Number(contracting.isDeleted) === 1) {
            return {
              deleteOne: {
                filter: { _id: contracting.id },
              },
            };
          } else {
            // Update the record if isDeleted is 0
            return {
              updateOne: {
                filter: { _id: contracting.id },
                update: {
                  $set: {
                    agentName: contracting.agentName,
                    npn: contracting.npn,
                    uplineName: contracting.uplineName,
                    uplineNpn: contracting.uplineNpn,
                    emails: contracting.emails,
                    jotform: contracting.jotform,
                    docuSign: contracting.docuSign,
                    contractsSubmitted: contracting.contractsSubmitted,
                    carriers: contracting.carriers,
                  },
                },
                upsert: false,
              },
            };
          }
        } else {
          // Create a new record when no id is provided
          return {
            insertOne: {
              document: {
                agentName: contracting.agentName,
                npn: contracting.npn,
                uplineName: contracting.uplineName,
                uplineNpn: contracting.uplineNpn,
                emails: contracting.emails,
                jotform: contracting.jotform,
                docuSign: contracting.docuSign,
                contractsSubmitted: contracting.contractsSubmitted,
                carriers: contracting.carriers,
              },
            },
          };
        }
      });

      // Execute bulk operations
      await this.contractingModel.bulkWrite(bulkOperations);

      return { message: 'Operation success' };
    } catch (error) {
      console.error('Error creating contracting:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  async createContractingProducts(contractingDtos: any[]) {
    if (!contractingDtos.length || !contractingDtos[0]) {
      throw new BadRequestException('No data provided');
    }

    const columnNames = Object.keys(contractingDtos[0]);

    const missingColumns = this.requiredColumnsProducts.filter(
      (col) => !columnNames.includes(col),
    );
    if (missingColumns.length) {
      throw new BadRequestException(
        `missing columns: ${missingColumns.map(this.toSnakeCase).join(',')}`,
      );
    }

    try {
      const bulkOperations = contractingDtos.map((contracting) => {
        contracting.carrier = toScreamingSnakeCase(
          contracting.carrier.toLowerCase(),
        );
        // When an ID is provided
        if (contracting.id) {
          // Delete the record if isDeleted is 1
          if (Number(contracting.isDeleted) === 1) {
            return {
              deleteOne: {
                filter: { _id: contracting.id },
              },
            };
          } else {
            // Update the record if isDeleted is 0
            return {
              updateOne: {
                filter: { _id: contracting.id },
                update: {
                  $set: {
                    ...contracting,
                  },
                },
                upsert: false,
              },
            };
          }
        } else {
          // Create a new record when no id is provided
          return {
            insertOne: {
              document: {
                ...contracting,
              },
            },
          };
        }
      });

      // Execute bulk operations
      await this.contractingProductsModel.bulkWrite(bulkOperations);

      return { message: 'Operation success' };
    } catch (error) {
      console.error('Error creating contracting products:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  async getContractings(
    filterDto: LicenseFilterDto,
    isPagination = true,
  ): Promise<any> {
    try {
      filterDto.page = Number(filterDto.page) || 1;
      filterDto.limit = Number(filterDto.limit) || 10;
      filterDto.agentName = filterDto.agentName || '';
      const skip = (filterDto.page - 1) * filterDto.limit;

      const stageNumber = filterDto.stageNumber
        ? Number(filterDto.stageNumber)
        : null;

      const carriers = filterDto.carriers && filterDto.carriers !== 'null'
        ? filterDto.carriers.split(',').map(c => c.trim()).filter(c => c)
        : [];

      const npns = await this.employeeService.getAllDownlines(filterDto.npn);
      // Build the match condition using npn and, if provided, date filters
      const baseMatchConditions: any = {
        uplineNpn: { $in: npns },
      };

      if (filterDto.agentName) {
        baseMatchConditions.agentName = {
          $regex: filterDto.agentName,
          $options: 'i',
        };
      }

      if (carriers.length) {
        baseMatchConditions.$or = [
          { carrier: { $in: carriers } },
          { carrier: null },
          { carrier: '' },
        ];
      }

      // Create data match conditions with stage number filter
      const dataMatchConditions = { ...baseMatchConditions };
      if (stageNumber) {
        if (stageNumber === 1) {
          dataMatchConditions.docuSign = null;
        }
        if (stageNumber === 2) {
          dataMatchConditions.docuSign = { $ne: null };
        }
        if (stageNumber === 3) {
          dataMatchConditions.contractsSubmitted = { $ne: null };
        }
        if (stageNumber >= 4) {
          dataMatchConditions.carriers = {
            $elemMatch: {
              stageNumber: stageNumber,
            },
          };
        }
      }

      // Create two separate pipelines
      const dataPipeline: any[] = [
        {
          $match: dataMatchConditions,
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: isPagination
              ? [{ $skip: skip }, { $limit: filterDto.limit }]
              : [],
          },
        },
      ];

      const statsPipeline: any[] = [
        {
          $match: baseMatchConditions,
        },
        {
          $facet: {
            docuSignStats: [
              {
                $group: {
                  _id: {
                    $cond: {
                      if: { $ne: ['$docuSign', null] },
                      then: 'completed',
                      else: 'notCompleted',
                    },
                  },
                  count: { $sum: 1 },
                },
              },
            ],
            contractsSubmittedStats: [
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: {
                      $cond: {
                        if: { $ne: ['$contractsSubmitted', null] },
                        then: 1,
                        else: 0,
                      },
                    },
                  },
                },
              },
            ],
            stageStats: [
              {
                $unwind: {
                  path: '$carriers',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $group: {
                  _id: '$carriers.stageNumber',
                  count: { $sum: 1 },
                },
              },
              {
                $match: {
                  _id: { $ne: null },
                },
              },
              {
                $sort: { _id: 1 },
              },
            ],
          },
        },
      ];

      const [dataResults, statsResults] = await Promise.all([
        this.contractingModel.aggregate(dataPipeline),
        this.contractingModel.aggregate(statsPipeline),
      ]);

      const final_result: any = {
        total: dataResults?.[0]?.metadata?.[0]?.total || 0,
        page: filterDto.page,
        limit: filterDto.limit,
        docuSignStats: {
          completed:
            statsResults[0]?.docuSignStats?.find((stat) => stat._id === 'completed')
              ?.count || 0,
          notCompleted:
            statsResults[0]?.docuSignStats?.find(
              (stat) => stat._id === 'notCompleted',
            )?.count || 0,
        },
        totalContractsSubmitted:
          statsResults[0]?.contractsSubmittedStats?.[0]?.total || 0,
        stageStats:
          statsResults[0]?.stageStats?.reduce((acc, stat) => {
            if (stat._id !== null) {
              acc[`stage${stat._id}`] = stat.count;
            }
            return acc;
          }, {}) || {},
      };

      final_result.licenses = dataResults?.[0]?.data;

      return final_result;
    } catch (error) {
      console.error('Error creating contracting:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  async getContractingProducts(npn: string, carrier: string): Promise<any> {
    try {
      if (!npn || !carrier) {
        throw new BadRequestException('NPN and carrier are required');
      }

      const results = await this.contractingProductsModel.find({
        npn,
        carrier,
      });

      return results;
    } catch (error) {
      console.error('Error fetching contracting products:', error.message);
      throw new BadRequestException(error.message);
    }
  }
}
