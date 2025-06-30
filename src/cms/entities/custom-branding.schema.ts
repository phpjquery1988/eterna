import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class CustomBranding extends Document {
   @Prop({ required: true })
   theme: string;

   @Prop({ required: true })
   primaryColor: string;

   @Prop({ required: true })
   secondaryColor: string;

   @Prop({ required: false })
   logo: string;

   @Prop({ required: true })
   font: string;

   @Prop({ required: true, type: Types.ObjectId, ref: 'AgentProfile' })
   agentProfile: Types.ObjectId;
}

export const CustomBrandingSchema = SchemaFactory.createForClass(CustomBranding);
