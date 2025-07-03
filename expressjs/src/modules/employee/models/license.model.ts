// models/license.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

// If CarrierEnum and LicenseType are external enums, ensure they are available
// For this example, I'll assume they are defined elsewhere or replace with string literals
// or define them inline if they are simple string enums.
// For now, I'll assume they are handled externally or are implicitly strings.

export type LicenseDocument = HydratedDocument<License>;

export interface License extends Document {
  // type?: string; // Original commented out, keeping as is
  carrier?: string;
  npn?: string;
  agentName?: string;
  uplineName: string;
  uplineNpn: string;
  states?: string[];
  stageNumber?: number;
}

const LicenseSchema = new Schema<License>({
  // type: { type: String, enum: Object.values(LicenseType) }, // If LicenseType is an enum
  carrier: { type: String, required: false },
  npn: { type: String, required: false },
  agentName: { type: String, required: false },
  uplineName: { type: String, required: true },
  uplineNpn: { type: String, required: true },
  states: { type: [String], required: false },
  stageNumber: { type: Number, required: false },
}, { timestamps: true });

const LicenseModel = model<License>('License', LicenseSchema);

export default LicenseModel;