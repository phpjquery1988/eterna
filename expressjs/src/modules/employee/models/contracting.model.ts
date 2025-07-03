// models/contracting.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

export type ContractingDocument = HydratedDocument<Contracting>;

// Sub-document: Carrier (nested within Contracting)
export interface Carrier {
  carrier: string;
  carrierNumber?: string;
  stageNumber?: number;
}

const CarrierSchema = new Schema<Carrier>({
  carrier: { type: String, required: true },
  carrierNumber: { type: String, required: false },
  stageNumber: { type: Number, required: false },
}, { _id: false, versionKey: false }); // Matches @Schema({ _id: false, versionKey: false })

// Main Document: Contracting
export interface Contracting extends Document {
  agentName: string;
  npn?: string;
  uplineName?: string;
  uplineNpn?: string;
  emails?: string[];
  jotform?: Date;
  docuSign?: Date;
  contractsSubmitted?: Date;
  carriers?: Carrier[]; // Array of Carrier sub-documents
}

const ContractingSchema = new Schema<Contracting>({
  agentName: { type: String, required: true },
  npn: { type: String, required: false },
  uplineName: { type: String, required: false },
  uplineNpn: { type: String, required: false },
  emails: { type: [String], required: false },
  jotform: { type: Date, required: false },
  docuSign: { type: Date, required: false },
  contractsSubmitted: { type: Date, required: false },
  carriers: { type: [CarrierSchema], default: [] }, // Reference the sub-document schema
}, { timestamps: true });

const ContractingModel = model<Contracting>('Contracting', ContractingSchema);

export default ContractingModel;