// NPM Packages
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type AgentLicenseDocument = HydratedDocument<AgentLicense>;

@Schema({ timestamps: true })
export class AgentLicense extends Document {
   @Prop({ required: true, unique: true })
   id: string;

   @Prop({
      required: true,
      type: MongooseSchema.Types.ObjectId,
      ref: 'Employee', // Assuming agents are linked to employees
   })
   agentId: string;

   @Prop({ required: true })
   licenseStatus: string;

   @Prop({ required: true })
   licenseType: string;

   @Prop({ required: true })
   carrier: string;

   @Prop({ required: true })
   status: string;
}

export const AgentLicenseSchema = SchemaFactory.createForClass(AgentLicense);
