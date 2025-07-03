// models/take-action.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

export type TakeActionDocument = HydratedDocument<TakeAction>;

export interface TakeAction extends Document {
  policyNumber?: string;
  client?: string;
  agentName?: string;
  status?: string;
  actionRequired?: string;
  dueDate?: Date;
  notes?: string;
  priority?: string;
  assignedTo?: string;
  completedDate?: Date;
  receivedDate?: Date;
  createdAt?: Date; // Mongoose timestamps will handle this, but keeping for interface consistency
  updatedAt?: Date; // Mongoose timestamps will handle this, but keeping for interface consistency
}

const TakeActionSchema = new Schema<TakeAction>({
  policyNumber: { type: String },
  client: { type: String },
  agentName: { type: String },
  status: { type: String },
  actionRequired: { type: String },
  dueDate: { type: Date },
  notes: { type: String },
  priority: { type: String },
  assignedTo: { type: String },
  completedDate: { type: Date },
  receivedDate: { type: Date },
  // createdAt and updatedAt are typically handled by `timestamps: true`
  // but explicitly listed in your original @Prop
  // Mongoose will populate these automatically if `timestamps: true` is set.
}, { timestamps: true });

const TakeActionModel = model<TakeAction>('TakeAction', TakeActionSchema);

export default TakeActionModel;