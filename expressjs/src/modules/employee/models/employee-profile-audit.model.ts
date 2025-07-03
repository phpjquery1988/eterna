// models/employee-profile-audit.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

// Sub-document for audit history entries
export interface AuditHistoryEntry {
  npn: string;
  name: string;
  timestamp: Date;
  data: any; // MongooseSchema.Types.Mixed
}

const AuditHistorySchema = new Schema<AuditHistoryEntry>({
  npn: { type: String, required: true }, // Assuming npn is required for an audit entry
  name: { type: String, required: true }, // Assuming name is required for an audit entry
  timestamp: { type: Date, default: Date.now },
  data: { type: Schema.Types.Mixed },
}, { _id: false }); // Disable _id for subdocuments if not needed, as in your original NestJS schema's @Schema({ id: false })

// Main document for employee profile audit
export interface EmployeeProfileAudit extends Document {
  npn?: string; // Made optional as per your original schema `required: false`
  auditHistory: AuditHistoryEntry[];
}

const EmployeeProfileAuditSchema = new Schema<EmployeeProfileAudit>({
  npn: { type: String, required: false, unique: true },
  auditHistory: { type: [AuditHistorySchema], default: [] },
}, { timestamps: true });

const EmployeeProfileAuditModel = model<EmployeeProfileAudit>('EmployeeProfileAudit', EmployeeProfileAuditSchema);

export default EmployeeProfileAuditModel;