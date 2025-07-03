// models/agent-license.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

export type AgentLicenseDocument = HydratedDocument<AgentLicense>;

export interface AgentLicense extends Document {
   id: string; // This is the unique identifier for the license record itself
   agentId: any; // This would typically be a Mongoose.Types.ObjectId in practice
   licenseStatus: string;
   licenseType: string;
   carrier: string;
   status: string;
}

const AgentLicenseSchema = new Schema<AgentLicense>({
   id: { type: String, required: true, unique: true },
   agentId: {
      type: Schema.Types.ObjectId, // Use Schema.Types.ObjectId for references
      ref: 'Employee', // Reference to the 'Employee' model
      required: true,
   },
   licenseStatus: { type: String, required: true },
   licenseType: { type: String, required: true },
   carrier: { type: String, required: true },
   status: { type: String, required: true },
}, { timestamps: true });

const AgentLicenseModel = model<AgentLicense>('AgentLicense', AgentLicenseSchema);

export default AgentLicenseModel;