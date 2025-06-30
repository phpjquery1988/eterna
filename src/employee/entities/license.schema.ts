import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Document } from 'mongoose';
import { CarrierEnum } from '@app/contracts/enums/carrier-enum';
import { LicenseType } from '@app/contracts';
export type LicenseDocument = HydratedDocument<License>;

@Schema({ timestamps: true })
export class License extends Document {
  // @Prop({ enum: LicenseType })
  // type: string;

  @Prop({ type: String, required: false })
  carrier: string;

  @Prop({ required: false })
  npn: string;

  @Prop({ required: false })
  agentName: string;

  @Prop({ required: true })
  uplineName: string;

  @Prop({ required: true })
  uplineNpn: string;

  @Prop({ type: [String], required: false })
  states?: string[];

  @Prop({ required: false })
  stageNumber: number;
}

export const LicenseSchema = SchemaFactory.createForClass(License);
