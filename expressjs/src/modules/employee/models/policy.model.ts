// models/policy.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

export type PolicyDocument = HydratedDocument<Policy>;

export interface Policy extends Document {
  contactName?: string;
  email?: string;
  phone?: string;
  source?: string;
  dateAdded?: Date;
  dateSold?: Date;
  terminatedDate?: Date;
  type?: string;
  effectiveDate?: Date;
  terminated?: boolean;
  location?: string;
  product?: string;
  annualPremium?: number;
  commissionPremium?: number;
  carrierPolicyStatus?: string;
  consolidatedPolicyStatus?: string;
  carrier?: string;
  policyNo?: string;
  npn?: string;
  agent?: string;
  agentType?: string;
  agentsUpline?: string;
  agentsUplineNpn?: string;
  expectedCommission?: number;
  policyStatus?: string;
  commissionStatus?: string;
  policyCount?: number;
  exportdt?: Date;
}

const PolicySchema = new Schema<Policy>({
  contactName: { type: String },
  email: { type: String },
  phone: { type: String },
  source: { type: String },
  dateAdded: { type: Date },
  dateSold: { type: Date },
  terminatedDate: { type: Date },
  type: { type: String },
  effectiveDate: { type: Date },
  terminated: { type: Boolean },
  location: { type: String },
  product: { type: String },
  annualPremium: { type: Number },
  commissionPremium: { type: Number },
  carrierPolicyStatus: { type: String },
  consolidatedPolicyStatus: { type: String },
  carrier: { type: String },
  policyNo: { type: String },
  npn: { type: String },
  agent: { type: String },
  agentType: { type: String },
  agentsUpline: { type: String },
  agentsUplineNpn: { type: String },
  expectedCommission: { type: Number },
  policyStatus: { type: String },
  commissionStatus: { type: String },
  policyCount: { type: Number },
  exportdt: { type: Date },
}, { timestamps: true });

const PolicyModel = model<Policy>('Policy', PolicySchema);

export default PolicyModel;