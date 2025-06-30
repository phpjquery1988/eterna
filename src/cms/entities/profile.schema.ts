import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema(
   {
      timestamps: true,
   },
)
export class AgentProfile extends Document {
   @Prop({ required: false })
   fullName: string;

   @Prop()
   avatar?: string;

   @Prop()
   phone?: string;

   @Prop()
   email?: string;

   @Prop()
   address?: string;

   @Prop()
   websiteUrl?: string;

   @Prop()
   socialMediaLinks?: string[];


   @Prop()
   headline?: string;

   @Prop()
   bio?: string;

   @Prop({ type: Number, min: 0 })
   yearsOfExperience?: number;

   @Prop()
   npn: string;


   @Prop({
      default: Date.now,
   })
   updatedAt: Date;

   @Prop({ 
      default: false
   })
   isApproved: boolean;


   @Prop({
      editable: false,
   })
   hash: string;
}

export const AgentProfileSchema = SchemaFactory.createForClass(AgentProfile);
