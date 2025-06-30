import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class StaticData extends Document {
   @Prop([{ name: { type: String }, image: { type: String }, code: { type: String } }])
   state: { name?: string; image?: string, code?: string }[];

   @Prop([{ name: { type: String }, image: { type: String }, code: { type: String } }])
   carrier: { name?: string; image?: string, code?: string }[];
}

export const StaticDataSchema = SchemaFactory.createForClass(StaticData);
