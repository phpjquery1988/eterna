// NPM Packages
import { EmployeeProfileStatus, UserRoleEnum } from '@app/contracts';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type EmployeeProfileDocument = HydratedDocument<EmployeeProfile>;

@Schema({ id: false })
export class License {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  postal: string;

  @Prop({ required: true })
  imageUrl: string;
}

export const LicenseSchema = SchemaFactory.createForClass(License);

@Schema({ id: false })
export class Carrier extends Document {
  @Prop({ type: String, required: false })
  carrier: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ required: false })
  imageUrl: string;
}

export const CarrierSchema = SchemaFactory.createForClass(Carrier);

@Schema({ timestamps: true })
export class EmployeeProfile extends Document {
  @Prop({ required: false, unique: true })
  npn: string;

  @Prop()
  avatar: string;

  @Prop({ required: false })
  phone: string;

  @Prop({ required: false })
  email: string;

  @Prop({ required: false })
  name: string;

  @Prop({ required: false })
  upline: string;

  @Prop({ required: false })
  uplineNpn: string;

  @Prop()
  quote: string;

  @Prop()
  isPublished: boolean;

  @Prop()
  isNewAvatar: boolean;

  @Prop()
  rating: number;

  @Prop()
  familyPhoto: string;

  @Prop()
  familyDescription: string;

  @Prop()
  address: string;

  @Prop({ type: [LicenseSchema], default: [] })
  licenses: License[];

  // An array of carriers (each with a value and label)
  @Prop({ type: [CarrierSchema], default: [] })
  carriers: Carrier[];

  @Prop({ enum: EmployeeProfileStatus })
  status: string;

  @Prop()
  quoteLink: string;

  @Prop()
  appointmentLink: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop({ default: '' })
  designation: string;

  @Prop({ default: '' })
  contactDetailDescription: string;

  @Prop()
  facebookLink: string;

  @Prop()
  instaLink: string;

  @Prop()
  linkedInLink: string;

  @Prop({ default: [], type: [String] })
  insuranceTypes: string[];

  @Prop({
    type: [
      {
        title: { type: String, required: false },
        description: { type: String, required: false },
      },
    ],
    default: [
      {
        title: 'Instant Coverage',
        description:
          'Get coverage up to $2M without a medical exam-just answer few easy health questions.',
      },
      {
        title: 'Broad Age Coverage',
        description:
          'We can offer a coverage to over 90% of applicants aged 20-85, on average.',
      },
      {
        title: 'Tailored Options',
        description:
          'Flexible coverage plans to suit various budgets and needs.',
      },
      {
        title: 'Personalized Support',
        description: 'Our team is here to offer dedicated assistance.',
      },
    ],
  })
  serviceProvided: { title?: string; description?: string }[];

  @Prop({
    type: [
      {
        title: { type: String, required: false },
        description: { type: String, required: false },
      },
    ],
    default: [
      {
        title: 'Great Service!',
        description:
          "{{name}} is hands down the best insurance agent I've ever worked with. He took the time to walk me through every detail of my policy. Highly recommend! - Jessica Thompson",
      },
      {
        title: 'Highly Recommended!',
        description:
          '{{name}} was great to work with — very knowledgeable and responsive. He helped me switch auto and home insurance and saved me a good chunk of money. — Brian Matthews',
      },
      {
        title: 'Stress-Free Service',
        description:
          '{{name}} made the entire insurance process smooth and stress-free. He’s not just an agent—he’s someone you can actually rely on.',
      },
      {
        title: 'Greate Service',
        description:
          '{{name}} was great to work with — very knowledgeable and responsive. He helped me switch auto and home insurance and saved me a good chunk of money. — Brian Matthews',
      },
      {
        title: 'Thank you!',
        description:
          '{{name}} is hands down the best insurance agent I’ve ever worked with. He took the time to walk me through every detail of my policy. Highly Recommend! — Jessica Thompson',
      },
    ],
  })
  whyWorkWithServices: { title?: string; description?: string }[];

  @Prop({ default: '' })
  whyWorkWithDescription: string;

  @Prop({
    required: true,
    enum: UserRoleEnum,
    type: String,
    default: UserRoleEnum.Employee,
  })
  role: UserRoleEnum;
}

export const EmployeeProfileSchema =
  SchemaFactory.createForClass(EmployeeProfile);
