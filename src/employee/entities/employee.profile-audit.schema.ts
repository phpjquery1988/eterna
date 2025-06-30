import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type EmployeeProfileAuditDocument =
  HydratedDocument<EmployeeProfileAudit>;

@Schema({ id: false })
export class AuditHistoryEntry {
  @Prop()
  npn: string;

  @Prop()
  name: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;

  @Prop({ type: MongooseSchema.Types.Mixed })
  data: any;
}

export const AuditHistorySchema =
  SchemaFactory.createForClass(AuditHistoryEntry);

@Schema({ timestamps: true })
export class EmployeeProfileAudit extends Document {
  @Prop({ required: false, unique: true })
  npn: string;

  // Audit history as an array of subdocuments containing a timestamp and mixed data
  @Prop({ type: [AuditHistorySchema], default: [] })
  auditHistory: AuditHistoryEntry[];
}

export const EmployeeProfileAuditSchema =
  SchemaFactory.createForClass(EmployeeProfileAudit);
