// models/employee.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

// Re-exporting for consistency, though in Express, you might just use Document directly
export type EmployeeDocument = HydratedDocument<Employee>;

export interface Employee extends Document {
  npn?: string;
  agent?: string;
  phone?: string;
  email?: string;
  agentType?: string;
  eftdt?: Date;
  enddt?: Date;
  agentStatus?: string;
  agentsUpline?: string;
  agentsUplineNpn?: string;
  hrnpn?: string;
  employeeHierarchy?: string[];
  Eftdt?: string; // Note: You have both eftdt (Date) and Eftdt (string) - might want to review this.
  Enddt?: string; // Note: You have both enddt (Date) and Enddt (string) - might want to review this.
  batchId?: string;
  avatar?: string;
  otherPhones?: string[];
  residentState?: string;
}

const EmployeeSchema = new Schema<Employee>({
  npn: { type: String, required: false, unique: true },
  agent: { type: String, required: false },
  phone: { type: String, required: false },
  email: { type: String, required: false },
  agentType: { type: String, required: false },
  eftdt: { type: Date, required: false },
  enddt: { type: Date, required: false },
  agentStatus: { type: String },
  agentsUpline: { type: String },
  agentsUplineNpn: { type: String },
  hrnpn: { type: String },
  employeeHierarchy: { type: [String] },
  Eftdt: { type: String },
  Enddt: { type: String },
  batchId: { type: String },
  avatar: { type: String },
  otherPhones: { type: [String], default: [] },
  residentState: { type: String },
}, { timestamps: true });

// Add indexes for optimal query performance
EmployeeSchema.index({ agentsUplineNpn: 1 }); // For hierarchy traversal
EmployeeSchema.index({ agentsUplineNpn: 1, npn: 1 }); // Compound index for hierarchy queries

const EmployeeModel = model<Employee>('Employee', EmployeeSchema);

export default EmployeeModel;