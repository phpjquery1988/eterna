import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ContractingProductsDocument = HydratedDocument<ContractingProducts>;

@Schema({ timestamps: true })
export class ContractingProducts {
  @Prop({ required: true })
  agentName: string;

  @Prop({ required: false })
  npn: string;

  @Prop({ required: false })
  carrier: string;

  @Prop({ required: false })
  product: string;

  @Prop({ required: false })
  status: string;

  @Prop({ required: false })
  eff_date: Date;
}

export const ContractingProductsSchema =
  SchemaFactory.createForClass(ContractingProducts);
