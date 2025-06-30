import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Blog extends Document {
   @Prop({ required: true })
   blogTitle: string;

   @Prop({ required: true })
   blogContent: string;

   @Prop({ required: true })
   publishDate: Date;

   @Prop({ type: [String], default: [] })
   tags: string[];

   @Prop()
   featuredImage?: string;

   @Prop({ required: true, type: Types.ObjectId, ref: 'AgentProfile' })
   agentProfile: Types.ObjectId;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
