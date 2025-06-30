import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class FAQ extends Document {
   @Prop({ required: true })
   question: string;

   @Prop({ required: true })
   answer: string;

   @Prop({ required: false })
   category?: string;

   @Prop({ required: true, type: Types.ObjectId, ref: 'AgentProfile' })
   agentProfile: Types.ObjectId;
}

export const FAQSchema = SchemaFactory.createForClass(FAQ);
