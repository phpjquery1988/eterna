// models/employee-hierarchy.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

export type EmployeeHierarchyDocument = HydratedDocument<EmployeeHierarchy>;

export interface EmployeeHierarchy extends Document {
   employeeId: any; // This would typically be a Mongoose.Types.ObjectId in practice
   supervisorId: any; // This would typically be a Mongoose.Types.ObjectId in practice
   eftdt?: Date;
   enddt?: Date;
}

const EmployeeHierarchySchema = new Schema<EmployeeHierarchy>({
   employeeId: {
      type: Schema.Types.ObjectId, // Use Schema.Types.ObjectId for references
      ref: 'Employee', // Reference to the 'Employee' model
      required: true,
   },
   supervisorId: {
      type: Schema.Types.ObjectId, // Use Schema.Types.ObjectId for references
      ref: 'Employee', // Reference to the 'Employee' model
      required: true,
   },
   eftdt: { type: Date, required: false, default: Date.now }, // Use Date.now for default
   enddt: { type: Date, required: false, default: Date.now }, // Use Date.now for default
}, { timestamps: true });

const EmployeeHierarchyModel = model<EmployeeHierarchy>('EmployeeHierarchy', EmployeeHierarchySchema);

export default EmployeeHierarchyModel;