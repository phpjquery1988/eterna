import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class ContactForm extends Document {
   @Prop({ required: true })
   formTitle: string;

   @Prop({ required: true })
   name: string;

   @Prop({ required: true })
   email: string;

   @Prop({ required: true })
   phoneNumber: string;

   @Prop({ required: true })
   inquiryType: string[];

   @Prop({ required: true })
   message: string;

   @Prop({ required: true })
   submissionRedirectUrl: string;

   @Prop({ required: true, type: Types.ObjectId, ref: 'AgentProfile' })
   agentProfile: Types.ObjectId;
}

export const ContactFormSchema = SchemaFactory.createForClass(ContactForm);
