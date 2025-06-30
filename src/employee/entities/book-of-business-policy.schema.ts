import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PolicyStatus, ActionStatus } from '../enums/policy-status.enum';

export type BookOfBusinessPolicyDocument =
  HydratedDocument<BookOfBusinessPolicy>;

@Schema({ timestamps: true })
export class BookOfBusinessPolicy {
  @Prop()
  client: string;

  @Prop()
  clientPhone: string;

  @Prop()
  clientEmail: string;

  @Prop()
  policyNumber: string;

  @Prop()
  product: string;

  @Prop()
  receivedDate: Date;

  @Prop()
  agent1: string;

  @Prop({ enum: Object.values(PolicyStatus) })
  status: PolicyStatus;

  @Prop()
  bob: string;

  @Prop()
  carrier: string;
  
  @Prop()
  issue: string;

  @Prop()
  state: string;

  @Prop()
  issueDate: Date;

  @Prop()
  annualizedPremium: number;

  @Prop()
  hierarchy: string;

  @Prop()
  npn: string;

  // Action status fields for take action disposition
  @Prop({ enum: Object.values(ActionStatus), default: ActionStatus.PENDING })
  actionStatus: ActionStatus;

  @Prop()
  actionCompletedDate: Date;

  @Prop()
  firstTakeActionDate: Date;
}

export const BookOfBusinessPolicySchema =
  SchemaFactory.createForClass(BookOfBusinessPolicy);

// Add indexes for optimal query performance
BookOfBusinessPolicySchema.index({ npn: 1, bob: 1, receivedDate: -1 }); // Main compound index for common queries
BookOfBusinessPolicySchema.index({ policyNumber: 1 }); // For take action lookups
BookOfBusinessPolicySchema.index({ agent1: 'text', client: 'text', policyNumber: 'text' }); // Text search
BookOfBusinessPolicySchema.index({ receivedDate: -1 }); // For date sorting and range queries
BookOfBusinessPolicySchema.index({ bob: 1, status: 1 }); // For status filtering with bob
BookOfBusinessPolicySchema.index({ npn: 1, carrier: 1 }); // For carrier filtering within hierarchy
BookOfBusinessPolicySchema.index({ actionStatus: 1, status: 1 }); // For status count calculations
BookOfBusinessPolicySchema.index({ npn: 1, bob: 1, carrier: 1, receivedDate: -1 }); // Comprehensive compound index
