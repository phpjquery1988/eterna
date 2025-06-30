import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class SeoSettings extends Document {
   @Prop({ required: true })
   metaTitle: string;

   @Prop({ required: true })
   metaDescription: string;

   @Prop({ required: true })
   keywords: string[];

   @Prop({ required: true })
   customUrlSlug: string;

   @Prop({ required: true, type: Types.ObjectId, ref: 'AgentProfile' })
   agentProfile: Types.ObjectId;
}

export const SeoSettingsSchema = SchemaFactory.createForClass(SeoSettings);
