// NPM Packages
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type AgentHierarchyDocument = HydratedDocument<AgentHierarchy>;

@Schema({ timestamps: true })
export class AgentHierarchy extends Document {

   @Prop()
   batchId: string;

   @Prop({
      default: []
   })
   hierarchy: string[];
}

export const AgentHierarchySchema = SchemaFactory.createForClass(AgentHierarchy);
