import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class InsuranceProduct extends Document {
   @Prop({ required: true })
   productName: string;

   @Prop({ required: true })
   description: string;

   @Prop({ required: true })
   priceRange: string;

   @Prop({ required: true })
   benefits: string;

   @Prop({ required: false })
   media: string;

   @Prop({ required: false })
   brochure: string;

   @Prop({ required: true, type: Types.ObjectId, ref: 'AgentProfile' })
   agentProfile: Types.ObjectId;
}

export const InsuranceProductSchema = SchemaFactory.createForClass(InsuranceProduct);
