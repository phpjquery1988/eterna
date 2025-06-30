import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Testimonial extends Document {
   @Prop({ required: false })
   clientName: string;

   @Prop({ required: false })
   testimonialContent: string;

   @Prop()
   clientPicture?: string;

   @Prop({ required: false, type: Number, min: 1, max: 5 })
   rating: number;

   @Prop({ required: true, type: Types.ObjectId, ref: 'AgentProfile' })
   agentProfile: Types.ObjectId;
}

export const TestimonialSchema = SchemaFactory.createForClass(Testimonial);
