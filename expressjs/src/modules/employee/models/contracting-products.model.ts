// models/contracting-products.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

export type ContractingProductsDocument = HydratedDocument<ContractingProducts>;

export interface ContractingProducts extends Document {
  agentName: string;
  npn?: string;
  carrier?: string;
  product?: string;
  status?: string;
  eff_date?: Date;
}

const ContractingProductsSchema = new Schema<ContractingProducts>({
  agentName: { type: String, required: true },
  npn: { type: String, required: false },
  carrier: { type: String, required: false },
  product: { type: String, required: false },
  status: { type: String, required: false },
  eff_date: { type: Date, required: false },
}, { timestamps: true });

const ContractingProductsModel = model<ContractingProducts>('ContractingProducts', ContractingProductsSchema);

export default ContractingProductsModel;