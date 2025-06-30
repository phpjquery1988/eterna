import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Document } from 'mongoose';
export type LicenseDocument = HydratedDocument<Compensation>;

@Schema({ timestamps: true, strict: false })
export class Compensation extends Document {
  @Prop({ type: String })
  type: string;

  @Prop({ type: String })
  carrier: string;

  @Prop({ type: String })
  product: string;
}

export const CompensationSchema = SchemaFactory.createForClass(Compensation);
