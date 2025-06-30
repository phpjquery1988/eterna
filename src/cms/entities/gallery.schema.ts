import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Gallery extends Document {
   @Prop({ required: true })
   title: string;

   @Prop({ required: true })
   description: string;

   @Prop({ type: [String], default: [] })
   images: string[];

   @Prop({ type: [String], default: [] })
   videoLinks: string[];

   @Prop({ required: true, type: Types.ObjectId, ref: 'AgentProfile' })
   agentProfile: Types.ObjectId;
}

export const GallerySchema = SchemaFactory.createForClass(Gallery);
