import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Carrier } from '../entities/carrier.schema';

@Injectable()
export class CarrierService {
  constructor(
    @InjectModel(Carrier.name)
    private readonly carrierModel: Model<Carrier>,
  ) {}

  toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  async updateSortOrder(carriers: { id: number; sortOrder: number }[]) {
    const updatePromises = carriers.map(async (carrier) => {
      const result = await this.carrierModel.findByIdAndUpdate(carrier.id, {
        $set: { sortOrder: carrier.sortOrder },
      });
      console.log(
        `Updated Carrier: ${carrier.id}, Sort Order: ${carrier.sortOrder}, Result:`,
        result,
      );
      return result;
    });

    await Promise.all(updatePromises); // Execute all updates in parallel
    return { message: 'Sort order updated successfully' };
  }

  async allCarriers() {
    return this.carrierModel.find({});
  }

  async updateCarrier(id: string, data: any) {
    const employee = await this.carrierModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    );
    return employee;
  }

  async createCarrier(data: any) {
    const employee = await this.carrierModel.create(data);
    return employee;
  }

  async deleteCarrier(id: string) {
    const employee = await this.carrierModel.findByIdAndDelete(id, {
      new: true,
    });
    return employee;
  }
}
