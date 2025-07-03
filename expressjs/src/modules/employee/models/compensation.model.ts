// models/compensation.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

// Corrected type export name to match class name
export type CompensationDocument = HydratedDocument<Compensation>;

export interface Compensation extends Document {
  type?: string;
  carrier?: string;
  product?: string;
}

const CompensationSchema = new Schema<Compensation>({
  type: { type: String },
  carrier: { type: String },
  product: { type: String },
}, { timestamps: true, strict: false }); // Preserve strict: false from original

const CompensationModel = model<Compensation>('Compensation', CompensationSchema);

export default CompensationModel;