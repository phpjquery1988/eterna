import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class CallToAction extends Document {
   @Prop({ required: true })
   primaryButtonText: string;

   @Prop({ required: true })
   primaryButtonLink: string;

   @Prop()
   secondaryButtonText?: string;

   @Prop()
   secondaryButtonLink?: string;

   @Prop({ required: true, type: Types.ObjectId, ref: 'AgentProfile' })
   agentProfile: Types.ObjectId;
}

export const CallToActionSchema = SchemaFactory.createForClass(CallToAction);
