import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type EmployeeDocument = HydratedDocument<Employee>;

@Schema({ timestamps: true })
export class Employee extends Document {
  @Prop({ required: false, unique: true })
  npn: string;

  @Prop({ required: false })
  agent: string;

  @Prop({ required: false })
  phone: string;

  @Prop({ required: false })
  email: string;

  @Prop({ required: false })
  agentType: string;

  @Prop({ required: false })
  eftdt: Date;

  @Prop()
  enddt: Date;

  @Prop()
  agentStatus: string;

  @Prop()
  agentsUpline: string;

  @Prop()
  agentsUplineNpn: string;

  @Prop()
  hrnpn: string;

  @Prop()
  employeeHierarchy: string[];

  @Prop()
  Eftdt: string;

  @Prop()
  Enddt: string;

  @Prop()
  batchId: string;

  @Prop()
  avatar: string;

  @Prop({ type: [String], default: [] })
  otherPhones?: string[];

  @Prop()
  residentState: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

// Add indexes for optimal query performance
// Note: npn already has an index due to unique: true constraint
EmployeeSchema.index({ agentsUplineNpn: 1 }); // For hierarchy traversal
EmployeeSchema.index({ agentsUplineNpn: 1, npn: 1 }); // Compound index for hierarchy queries
