// models/static-data.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

export type StaticDataDocument = HydratedDocument<StaticData>;

export interface StaticDataItem {
  name?: string;
  image?: string;
  code?: string;
}

export interface StaticData extends Document {
  state: StaticDataItem[];
  carrier: StaticDataItem[];
}

const StaticDataSchema = new Schema<StaticData>({
  state: {
    type: [{ name: { type: String }, image: { type: String }, code: { type: String } }],
    default: [],
  },
  carrier: {
    type: [{ name: { type: String }, image: { type: String }, code: { type: String } }],
    default: [],
  },
}, { timestamps: true });

const StaticDataModel = model<StaticData>('StaticData', StaticDataSchema);

export default StaticDataModel;