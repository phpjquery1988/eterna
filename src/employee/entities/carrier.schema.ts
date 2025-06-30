import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Carrier extends Document {
  @Prop({ type: String, required: false })
  carrier: string;

  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @Prop({ required: false })
  imageUrl: string;

  @Prop({ required: false })
  sortOrder: number;

  @Prop({ required: false })
  isForLicense: boolean;
}

export const CarrierSchema = SchemaFactory.createForClass(Carrier);
