// NPM Packages
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type PolicyDocument = HydratedDocument<Policy>;

@Schema({ timestamps: true })
export class Policy extends Document {
  @Prop()
  contactName: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;

  @Prop()
  source: string;

  @Prop()
  dateAdded: Date;

  @Prop()
  dateSold: Date;

  @Prop()
  terminatedDate: Date;

  @Prop()
  type: string;

  @Prop()
  effectiveDate: Date;

  @Prop()
  terminated: boolean;

  @Prop()
  location: string;

  @Prop()
  product: string;

  @Prop()
  annualPremium: number;

  @Prop()
  commissionPremium: number;

  @Prop()
  carrierPolicyStatus: string;

  @Prop()
  consolidatedPolicyStatus: string;

  @Prop()
  carrier: string;

  @Prop()
  policyNo: string;

  @Prop()
  npn: string;

  @Prop()
  agent: string;

  @Prop()
  agentType: string;

  @Prop()
  agentsUpline: string;

  @Prop()
  agentsUplineNpn: string;

  @Prop()
  expectedCommission: number;

  @Prop()
  policyStatus: string;

  @Prop()
  commissionStatus: string;

  @Prop()
  policyCount: number;

  @Prop()
  exportdt: Date;
}

export const PolicySchema = SchemaFactory.createForClass(Policy);
