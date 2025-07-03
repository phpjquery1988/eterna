// models/book-of-business-policy.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

// If these enums are external, ensure they are accessible in your project.
// For this example, I'll define them inline.
export enum PolicyStatus {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
  Cancelled = 'cancelled',
}

export enum ActionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

export type BookOfBusinessPolicyDocument = HydratedDocument<BookOfBusinessPolicy>;

export interface BookOfBusinessPolicy extends Document {
  client?: string;
  clientPhone?: string;
  clientEmail?: string;
  policyNumber?: string;
  product?: string;
  receivedDate?: Date;
  agent1?: string;
  status?: PolicyStatus;
  bob?: string;
  carrier?: string;
  issue?: string;
  state?: string;
  issueDate?: Date;
  annualizedPremium?: number;
  hierarchy?: string;
  npn?: string;
  actionStatus?: ActionStatus;
  actionCompletedDate?: Date;
  firstTakeActionDate?: Date;
}

const BookOfBusinessPolicySchema = new Schema<BookOfBusinessPolicy>({
  client: { type: String },
  clientPhone: { type: String },
  clientEmail: { type: String },
  policyNumber: { type: String },
  product: { type: String },
  receivedDate: { type: Date },
  agent1: { type: String },
  status: { type: String, enum: Object.values(PolicyStatus) },
  bob: { type: String },
  carrier: { type: String },
  issue: { type: String },
  state: { type: String },
  issueDate: { type: Date },
  annualizedPremium: { type: Number },
  hierarchy: { type: String },
  npn: { type: String },
  actionStatus: { type: String, enum: Object.values(ActionStatus), default: ActionStatus.PENDING },
  actionCompletedDate: { type: Date },
  firstTakeActionDate: { type: Date },
}, { timestamps: true });

// Add indexes for optimal query performance
BookOfBusinessPolicySchema.index({ npn: 1, bob: 1, receivedDate: -1 }); // Main compound index for common queries
BookOfBusinessPolicySchema.index({ policyNumber: 1 }); // For take action lookups
BookOfBusinessPolicySchema.index({ agent1: 'text', client: 'text', policyNumber: 'text' }); // Text search
BookOfBusinessPolicySchema.index({ receivedDate: -1 }); // For date sorting and range queries
BookOfBusinessPolicySchema.index({ bob: 1, status: 1 }); // For status filtering with bob
BookOfBusinessPolicySchema.index({ npn: 1, carrier: 1 }); // For carrier filtering within hierarchy
BookOfBusinessPolicySchema.index({ actionStatus: 1, status: 1 }); // For status count calculations
BookOfBusinessPolicySchema.index({ npn: 1, bob: 1, carrier: 1, receivedDate: -1 }); // Comprehensive compound index

const BookOfBusinessPolicyModel = model<BookOfBusinessPolicy>('BookOfBusinessPolicy', BookOfBusinessPolicySchema);

export default BookOfBusinessPolicyModel;