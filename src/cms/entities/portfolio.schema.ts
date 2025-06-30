import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Portfolio extends Document {
   @Prop({ required: true })
   caseStudyTitle: string;

   @Prop({ required: true })
   summary: string;

   @Prop({ required: true })
   outcomeImpact: string;

   @Prop([{ type: String }])
   media: string[];

   @Prop({ required: true, type: Types.ObjectId, ref: 'AgentProfile' })
   agentProfile: Types.ObjectId;
}

export const PortfolioSchema = SchemaFactory.createForClass(Portfolio);
