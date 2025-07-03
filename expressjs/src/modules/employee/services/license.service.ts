// Converted from NestJS Service
import { Request, Response } from 'express';

import { Model } from 'mongoose';
import { License } from '../entities/license.schema';
import { CreateLicenseDto, LicenseFilterDto } from '../dto/license.dto';
import { Carrier } from '../entities/carrier.schema';
import { EmployeeService } from './employee.service';


export class LicenseService {
  private requiredColumns: string[] = [
    'id',
    'agentName',
    'npn',
    'uplineName',
    'uplineNpn',
    'carrier',
    'stageNumber',
    'states',
    'isDeleted',
  ];

  constructor(
    
    private readonly licenseModel: Model<License>,
    
    private readonly carrierModel: Model<Carrier>,
    private readonly employeeService: EmployeeService,
  ) {}

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  private toScreamingSnakeCase(input: string): string {
    // Insert a space between a lowercase and uppercase letter (for camelCase words)
    const withSpaces = input.replace(/([a-z])([A-Z])/g, '$1 $2');

    // Split the string by spaces, hyphens, or underscores
    const words = withSpaces.split(/[\s-_]+/);

    // Convert each word to uppercase and join them with underscores
    return words.map((word) => word.toUpperCase()).join('_');
  }

  async createLicenses(createLicenseDtos: CreateLicenseDto[]) {
    if (createLicenseDtos.length && createLicenseDtos[0]) {
      const columnNames = Object.keys(createLicenseDtos[0]);

      // Find missing columns: present in "requiredColumns" but not in "columns"
      const missingColumns = this.requiredColumns.filter(
        (col) => !columnNames.includes(col),
      );
      if (missingColumns.length) {
        throw new BadRequestException(
          `missing columns: ${missingColumns.map(this.toSnakeCase).join(',')}`,
        );
      }
    }

    try {
      const uniqueCarrierSet = new Set(
        createLicenseDtos
          .filter((l) => l.carrier && l.carrier.trim())
          .map((l) => l.carrier),
      );
      const uniqueCarrierArray = [...uniqueCarrierSet];
      const bulkQueriesCarrier = uniqueCarrierArray.map((carrier) => {
        const slug = this.toScreamingSnakeCase(carrier);
        return {
          updateOne: {
            filter: { slug },
            update: { $set: { slug, carrier, isForLicense: true } },
            upsert: true,
          },
        };
      });

      const bulkQueriesLicense = createLicenseDtos.map((license) => {
        const states = license.states.split(',').filter((s) => !!s);

        // Convert carrier to PASCASED style (Screaming Snake Case)
        const carrier = license.carrier
          ? this.toScreamingSnakeCase(license.carrier.trim())
          : null;

        // When an ID is provided
        if (license.id) {
          // Delete the record if isDeleted is 1
          if (Number(license.isDeleted) === 1) {
            return {
              deleteOne: {
                filter: { _id: license.id },
              },
            };
          } else {
            // Update the record if isDeleted is 0
            // If you have additional filter conditions (e.g., based on carrier),
            // you might want to incorporate them here. Otherwise, update by id.
            return {
              updateOne: {
                filter: { _id: license.id },
                update: {
                  $set: {
                    agentName: license.agentName,
                    npn: license.npn,
                    uplineName: license.uplineName,
                    uplineNpn: license.uplineNpn,
                    carrier: carrier, // could be null if not provided
                    stageNumber: Number(license.stageNumber),
                    states: states,
                  },
                },
                upsert: false, // Do not create a new record if it doesn't exist.
              },
            };
          }
        } else {
          // Create a new record when no id is provided.
          // Using insertOne to create a fresh document.
          return {
            insertOne: {
              document: {
                agentName: license.agentName,
                npn: license.npn,
                uplineName: license.uplineName,
                uplineNpn: license.uplineNpn,
                carrier: carrier,
                stageNumber: Number(license.stageNumber),
                states: states,
                // Optionally, add any other fields as needed.
              },
            },
          };
        }
      });

      await this.carrierModel.updateMany({}, { $set: { isForLicense: false } });
      // Execute bulkWrite operation
      await Promise.all([
        this.licenseModel.bulkWrite(bulkQueriesLicense),
        this.carrierModel.bulkWrite(bulkQueriesCarrier),
      ]);

      return { message: 'Operation success' };
    } catch (error) {
      console.error('Error creating licenses:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  async getLicenses(
    licenseFilterDto: LicenseFilterDto,
    isPagination = true,
  ): Promise<any> {
    try {
      licenseFilterDto.page = Number(licenseFilterDto.page) || 1;
      licenseFilterDto.limit = Number(licenseFilterDto.limit) || 10;
      licenseFilterDto.agentName = licenseFilterDto.agentName || '';
      const skip = (licenseFilterDto.page - 1) * licenseFilterDto.limit;

      const stageNumbers = licenseFilterDto.stageNumbers
        ? licenseFilterDto.stageNumbers.split(',').map((s) => Number(s))
        : [];

      const carriers = licenseFilterDto.carriers && licenseFilterDto.carriers !== 'null'
        ? licenseFilterDto.carriers.split(',').map(c => c.trim()).filter(c => c)
        : [];
      const states = licenseFilterDto.states
        ? licenseFilterDto.states.split(',')
        : [];

      const [npns, dbCarriers] = await Promise.all([
        this.employeeService.getAllDownlines(licenseFilterDto.npn),
        this.carrierModel.find(),
      ]);
      // Build the match condition using npn and, if provided, date filters
      const matchConditions: any = {
        uplineNpn: { $in: npns },
      };

      if (licenseFilterDto.agentName) {
        matchConditions.agentName = {
          $regex: licenseFilterDto.agentName,
          $options: 'i',
        };
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

      const aggregate: any = [
        {
          $match: matchConditions,
        },
        {
          $group: {
            _id: { npn: '$npn', agentName: '$agentName' },
            licenses: {
              $push: '$$ROOT',
            },
          },
        },
        {
          $sort: { '_id.agentName': 1 },
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: isPagination
              ? [{ $skip: skip }, { $limit: licenseFilterDto.limit }]
              : [],
          },
        },
      ];

      // handle special case for stageNumbers 1 and 2, need to fech 3,4,5 records to make UI correct
      let promiseOtherStageRecords = null;
      if (stageNumbers.length === 1) {
        const stages = [1, 2, 3, 4, 5].filter((s) => s !== stageNumbers[0]);
        licenseFilterDto.stageNumbers = stages.join(',');
        promiseOtherStageRecords = this.getLicenses(licenseFilterDto, false);
      }

      const [results, otherStageRecords] = await Promise.all([
        this.licenseModel.aggregate(aggregate),
        promiseOtherStageRecords,
      ]);

      const final_result: any = {
        total: results?.[0]?.metadata?.[0]?.total || 0,
        page: licenseFilterDto.page,
        limit: licenseFilterDto.limit,
      };

      let licenses = results?.[0]?.data.map((d) => {
        let carriers =
          d.licenses.map((e) => ({
            carrier: e.carrier,
            stageNumber: e.stageNumber,
            states: states.length
              ? e.states.filter((s) => states.includes(s.include))
              : e.states,
          })) || [];

        const emptyCarrier = carriers.filter((c) =>
          [null, ''].includes(c.carrier),
        );

        const filledCarrier = carriers
          .filter((c) => ![null, ''].includes(c.carrier))
          .map((d) => d.carrier);

        if (
          emptyCarrier.length &&
          [1, 2].includes(emptyCarrier[0].stageNumber)
        ) {
          carriers.push(
            ...dbCarriers
              .filter((c) => !filledCarrier.includes(c.slug))
              .map((d) => ({
                carrier: d.slug,
                stageNumber: emptyCarrier[0].stageNumber,
                states: states.length
                  ? emptyCarrier[0].states.filter((s) =>
                      states.includes(s.include),
                    )
                  : emptyCarrier[0].states,
              })),
          );
        }

        carriers = carriers.filter(
          (c) => c.carrier !== null && c.carrier !== '',
        );
        return {
          npn: d.licenses[0].npn,
          agentName: d.licenses[0].agentName,
          carriers,
        };
      });

      if (otherStageRecords) {
        const otherStageLicenses = otherStageRecords.licenses;
        licenses = licenses.map((l) => {
          const currentStageNumbers = l.carriers.map((c) => c.stageNumber);

          const otherStage = otherStageLicenses.find(
            (s) => s.npn === l.npn && s.agentName === l.agentName,
          );
          if (otherStage) {
            l.carriers = l.carriers.map((c) => {
              const matchingCarrier = otherStage.carriers.find(
                (d) => d.carrier === c.carrier && d.stageNumber > 2,
              );
              return matchingCarrier ? matchingCarrier : c;
            });

            l.carriers.push(
              ...otherStage.carriers.filter(
                (c) => !currentStageNumbers.includes(c.stageNumber),
              ),
            );
          }
          return l;
        });
      }

      final_result.licenses = licenses;

      return final_result;
    } catch (error) {
      console.error('Error creating licenses:', error.message);
      throw new BadRequestException('Operation failed');
    }
  }
}
