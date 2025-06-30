import { ServiceCategory } from '@app/contracts/enums/service-category.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Service extends Document {
   @Prop({
      type: [String],
      required: true,
      enum: Object.values(ServiceCategory),
   })
   serviceCategories: ServiceCategory[];

   @Prop({ required: true })
   detailedServices: string;

   @Prop([{ type: String }])
   serviceIcons: string[];

   @Prop({ required: true, type: Types.ObjectId, ref: 'AgentProfile' })
   agentProfile: Types.ObjectId;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
