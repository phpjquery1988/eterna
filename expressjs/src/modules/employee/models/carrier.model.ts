// models/carrier.model.ts
import { Schema, model, Document } from 'mongoose';

// Note: Your original file did not export HydratedDocument for this schema,
// but it's good practice to include it if you'll be using Mongoose.
export type CarrierDocument = Document & {
  carrier?: string;
  slug: string;
  imageUrl?: string;
  sortOrder?: number;
  isForLicense?: boolean;
};

export interface Carrier extends Document {
  carrier?: string;
  slug: string;
  imageUrl?: string;
  sortOrder?: number;
  isForLicense?: boolean;
}

const CarrierSchema = new Schema<Carrier>({
  carrier: { type: String, required: false },
  slug: { type: String, required: true, unique: true },
  imageUrl: { type: String, required: false },
  sortOrder: { type: Number, required: false },
  isForLicense: { type: Boolean, required: false },
}, { timestamps: true });

const CarrierModel = model<Carrier>('Carrier', CarrierSchema);

export default CarrierModel;