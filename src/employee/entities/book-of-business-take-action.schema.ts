import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BookOfBusinessTakeActionDocument = HydratedDocument<BookOfBusinessTakeAction>;

@Schema({ timestamps: true })
export class BookOfBusinessTakeAction {
  @Prop()
  fileNumber: string;

  @Prop()
  dd: string;

  @Prop()
  primaryInsured: string;

  @Prop()
  agent: string;

  @Prop()
  underwriter: string;

  @Prop()
  effectiveDate: Date;

  @Prop()
  faceAmount: number;

  @Prop()
  planName: string;

  @Prop()
  riskClass: string;

  @Prop()
  paymentMode: string;

  @Prop()
  riders: string;

  @Prop()
  caseManager: string;

  @Prop()
  declineReason: string;

  @Prop()
  requirements: string;

  @Prop()
  withdrawnText: string;

  @Prop()
  summaryVerticalPanel: string;

  @Prop()
  closeDate: Date;

  @Prop()
  subject: string;

  @Prop()
  sender: string;

  @Prop()
  emailReceived: Date;

  @Prop()
  deliveryRequirements: string;

  @Prop()
  status: string;

  @Prop()
  bob: string;
}

export const BookOfBusinessTakeActionSchema = SchemaFactory.createForClass(BookOfBusinessTakeAction);

// Add indexes for optimal query performance
BookOfBusinessTakeActionSchema.index({ fileNumber: 1, _id: -1 }); // Compound index for latest take action lookup
BookOfBusinessTakeActionSchema.index({ fileNumber: 1 }); // For fileNumber lookups
