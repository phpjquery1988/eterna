import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ContractingDocument = HydratedDocument<Contracting>;

@Schema({ _id: false, versionKey: false })
export class Carrier {
  @Prop({ required: true })
  carrier: string;

  @Prop({ required: false })
  carrierNumber: string;

  @Prop({ required: false })
  stageNumber: number;
}

@Schema({ timestamps: true })
export class Contracting {
  @Prop({ required: true })
  agentName: string;

  @Prop({ required: false })
  npn: string;

  @Prop({ required: false })
  uplineName: string;

  @Prop({ required: false })
  uplineNpn: string;

  @Prop({ type: [String], required: false })
  emails: string[];

  @Prop({ required: false })
  jotform: Date;

  @Prop({ required: false })
  docuSign: Date;

  @Prop({ required: false })
  contractsSubmitted: Date;

  @Prop({ type: [Carrier], default: [] })
  carriers: Carrier[];

}

export const ContractingSchema = SchemaFactory.createForClass(Contracting);
