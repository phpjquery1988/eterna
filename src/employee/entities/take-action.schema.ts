import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class TakeAction extends Document {
  @Prop()
  policyNumber: string;

  @Prop()
  client: string;

  @Prop()
  agentName: string;

  @Prop()
  status: string;

  @Prop()
  actionRequired: string;

  @Prop()
  dueDate: Date;

  @Prop()
  notes: string;

  @Prop()
  priority: string;

  @Prop()
  assignedTo: string;

  @Prop()
  completedDate: Date;

  @Prop()
  receivedDate: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const TakeActionSchema = SchemaFactory.createForClass(TakeAction); 