import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Policy } from '../entities/policy.schema';
import { PolicyDto } from '../dto/create-policy.dto';
import { DateService } from './date.service';

@Injectable()
export class PolicyService {
  private requiredColumnsPolicy: string[] = [
    'id',
    'npn',
    'type',
    'email',
    'phone',
    'agent',
    'source',
    'product',
    'carrier',
    'policyNo',
    'exportdt',
    'dateSold',
    'location',
    'isDeleted',
    'agentType',
    'dateAdded',
    'terminated',
    'policyCount',
    'contactName',
    'agentsUpline',
    'policyStatus',
    'effectiveDate',
    'annualPremium',
    'terminatedDate',
    'agentsUplineNpn',
    'commissionStatus',
    'commissionPremium',
    'expectedCommission',
    'carrierPolicyStatus',
    'consolidatedPolicyStatus',
  ];

  constructor(
    @InjectModel(Policy.name)
    private readonly policyModel: Model<Policy>,
    private readonly dateService: DateService,
  ) {}

  toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  sanitizePolicyItem(item: PolicyDto): PolicyDto {
    if (item.dateSold.trim()) {
      item.dateSold = this.dateService.getStartDate(item.dateSold);
    }
    const terminatedDate = <string>(item.terminatedDate as any);
    if (terminatedDate.trim()) {
      item.terminatedDate = this.dateService.getStartDate(terminatedDate);
    } else {
      item.terminatedDate = null;
    }

    const effectiveDate = <string>(item.effectiveDate as any);
    if (effectiveDate.trim()) {
      item.effectiveDate = this.dateService.getStartDate(effectiveDate);
    } else {
      item.effectiveDate = null;
    }

    const exportdt = <string>(item.exportdt as any);
    if (exportdt.trim()) {
      item.exportdt = this.dateService.getStartDate(exportdt);
    } else {
      item.exportdt = null;
    }

    if (item.policyNo) {
      item.policyNo = item.policyNo.toUpperCase();
    }

    item.consolidatedPolicyStatus =
      item?.consolidatedPolicyStatus.toLowerCase();
    item.terminated = !(
      item.consolidatedPolicyStatus.includes('active') ||
      item.consolidatedPolicyStatus.includes('pending')
    );

    if (item.policyCount) {
      item.policyCount = Number(item.policyCount);
    }

    const dateAdded = <string>(item.dateAdded as any);
    if (dateAdded.trim()) {
      item.dateAdded = this.dateService.getStartDate(dateAdded);
    } else {
      item.dateAdded = null;
    }

    return item;
  }

  // policy ingestion
  async createPolicy(createPolicyDto: Partial<PolicyDto[]>) {
    if (createPolicyDto.length && createPolicyDto[0]) {
      const columnNames = Object.keys(createPolicyDto[0]);

      // Find missing columns: present in "requiredColumns" but not in "columns"
      const missingColumns = this.requiredColumnsPolicy.filter(
        (col) => !columnNames.includes(col),
      );
      if (missingColumns.length) {
        throw new BadRequestException(
          `missing columns: ${missingColumns.map(this.toSnakeCase).join(',')}`,
        );
      }
    }

    try {
      // Build an array of bulk operations based on the policy DTOs.
      const bulkOps = createPolicyDto.map((item) => {
        // Sanitize each item.
        item = this.sanitizePolicyItem(item);

        // When an ID is provided, determine whether to update or delete.
        if (item.id) {
          if (Number(item.isDeleted) === 1) {
            // Delete operation for items marked as deleted.
            return {
              deleteOne: {
                filter: { _id: item.id },
              },
            };
          } else {
            // Update operation for items that are not deleted.
            return {
              updateOne: {
                filter: { _id: item.id },
                update: { $set: { ...item } },
                upsert: false, // Do not insert if not found.
              },
            };
          }
        } else {
          // Insert operation for new items (no id provided).
          return {
            insertOne: {
              document: {
                ...item,
              },
            },
          };
        }
      });

      // Execute the bulkWrite operation on your policy model.
      await this.policyModel.bulkWrite(bulkOps);

      return { message: 'Operation success' };
    } catch (error) {
      console.error('Error creating policies:', error.message);
      throw new BadRequestException(error.message);
    }
  }
}
