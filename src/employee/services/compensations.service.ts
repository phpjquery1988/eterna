import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CompensationFilterDto,
  CreateCompensationDto,
} from '../dto/compensation.dto';
import { Compensation } from '../entities/compensation.schema';

@Injectable()
export class CompensationService {
  private requiredColumns: string[] = ['carrier', 'type', 'product'];

  constructor(
    @InjectModel(Compensation.name)
    private readonly compensationModel: Model<Compensation>,
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

  async createCompensations(compensationDtos: CreateCompensationDto[]) {
    if (compensationDtos.length && compensationDtos[0]) {
      const columnNames = Object.keys(compensationDtos[0]);

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
      const bulkQueriesCompensation = compensationDtos.map((compensation) => {
        const carrier = compensation.carrier
          ? compensation.carrier.trim()
          : null;
        delete compensation.__EMPTY;
        delete compensation.__EMPTY_1;
        delete compensation.id;
        delete compensation.isDeleted;
        console.log('[compensation]', compensation);

        return {
          insertOne: {
            document: {
              ...compensation,
              carrier,
            },
          },
        };
      });
      await this.compensationModel.deleteMany({});
      await this.compensationModel.bulkWrite(bulkQueriesCompensation);
      return { message: 'Operation success' };
    } catch (error) {
      console.error('Error creating compensations:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  async getCompensations(
    compensationFilterDto: CompensationFilterDto,
  ): Promise<any> {
    try {
      compensationFilterDto.product = compensationFilterDto.product || '';
      // Build the match condition using npn and, if provided, date filters
      const matchConditions: any = {
        product: { $regex: compensationFilterDto.product, $options: 'i' },
      };

      if (compensationFilterDto.carrier && compensationFilterDto.carrier !== 'null' && compensationFilterDto.carrier.trim()) {
        const carrierArray = compensationFilterDto.carrier.split(',').map(c => c.trim()).filter(c => c);
        if (carrierArray.length > 0) {
          matchConditions.carrier = { $in: carrierArray };
        }
      }

      if (compensationFilterDto.type) {
        matchConditions.type = compensationFilterDto.type;
      }
      const aggregate: any = [
        {
          $match: matchConditions,
        },
        {
          $sort: { carrier: 1 },
        },
      ];

      const results = await this.compensationModel.aggregate(aggregate);

      const compensations = results.map((d) => {
        delete d.createdAt;
        delete d.updatedAt;
        delete d.__v;
        return {
          _id: d._id,
          carrier: d.carrier,
          type: d.type,
          product: d.product,
          ...d,
        };
      });

      const types = [...new Set(compensations.map((c) => c.type))].sort();
      const carriers = [...new Set(compensations.map((c) => c.carrier))].sort();

      return {
        types,
        carriers,
        compensations,
      };
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Operation failed');
    }
  }
}
