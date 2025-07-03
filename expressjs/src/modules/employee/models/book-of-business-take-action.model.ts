// models/book-of-business-take-action.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

export type BookOfBusinessTakeActionDocument = HydratedDocument<BookOfBusinessTakeAction>;

export interface BookOfBusinessTakeAction extends Document {
  fileNumber?: string;
  dd?: string;
  primaryInsured?: string;
  agent?: string;
  underwriter?: string;
  effectiveDate?: Date;
  faceAmount?: number;
  planName?: string;
  riskClass?: string;
  paymentMode?: string;
  riders?: string;
  caseManager?: string;
  declineReason?: string;
  requirements?: string;
  withdrawnText?: string;
  summaryVerticalPanel?: string;
  closeDate?: Date;
  subject?: string;
  sender?: string;
  emailReceived?: Date;
  deliveryRequirements?: string;
  status?: string;
  bob?: string;
}

const BookOfBusinessTakeActionSchema = new Schema<BookOfBusinessTakeAction>({
  fileNumber: { type: String },
  dd: { type: String },
  primaryInsured: { type: String },
  agent: { type: String },
  underwriter: { type: String },
  effectiveDate: { type: Date },
  faceAmount: { type: Number },
  planName: { type: String },
  riskClass: { type: String },
  paymentMode: { type: String },
  riders: { type: String },
  caseManager: { type: String },
  declineReason: { type: String },
  requirements: { type: String },
  withdrawnText: { type: String },
  summaryVerticalPanel: { type: String },
  closeDate: { type: Date },
  subject: { type: String },
  sender: { type: String },
  emailReceived: { type: Date },
  deliveryRequirements: { type: String },
  status: { type: String },
  bob: { type: String },
}, { timestamps: true });

// Add indexes for optimal query performance
BookOfBusinessTakeActionSchema.index({ fileNumber: 1, _id: -1 }); // Compound index for latest take action lookup
BookOfBusinessTakeActionSchema.index({ fileNumber: 1 }); // For fileNumber lookups

const BookOfBusinessTakeActionModel = model<BookOfBusinessTakeAction>('BookOfBusinessTakeAction', BookOfBusinessTakeActionSchema);

export default BookOfBusinessTakeActionModel;