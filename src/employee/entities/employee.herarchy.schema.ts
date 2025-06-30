// NPM Packages
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Schema as MongooseSchema } from "mongoose";

export type EmployeeHierarchyDocument = HydratedDocument<EmployeeHierarchy>;

@Schema({ timestamps: true })
export class EmployeeHierarchy extends Document {

   @Prop({
      required: true,
      type: MongooseSchema.Types.ObjectId,
      ref: 'Employee'
   })
   employeeId: string;

   @Prop({
      required: true,
      type: MongooseSchema.Types.ObjectId,
      ref: 'Employee'
   })
   supervisorId: string;

   @Prop({ required: false, default: new Date() })
   eftdt: Date;

   @Prop({ required: false, default: new Date() })
   enddt: Date;
}

export const EmployeeHierarchySchema = SchemaFactory.createForClass(EmployeeHierarchy);
