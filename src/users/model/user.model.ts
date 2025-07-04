import { Document, SchemaTypes, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { UserSettings, UserSettingsSchema } from './userSettings.model';
import { UserRoleEnum } from '@app/contracts';
import { BaseEntity } from 'src/shared/base/base-entity';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
})
export class User extends BaseEntity {
  @Prop({
    maxlength: 1000,
  })
  avatar?: string;

  @Prop({ maxlength: 200 })
  firstName?: string;

  @Prop({ maxlength: 200 })
  lastName?: string;

  @Prop({
    maxlength: 500,
    minlength: 3,
    unique: true,
    index: true,
  })
  userName?: string;

  @Prop({
    required: true,
    enum: UserRoleEnum,
    type: String,
    default: UserRoleEnum.Regular,
  })
  role: UserRoleEnum;

  @Prop({
    lowercase: true,
    minlength: 5,
    maxlength: 255,
  })
  email?: string;

  @Prop({ maxlength: 1000 })
  address?: string;

  @Prop({
    maxlength: 200,
  })
  phone?: string;

  @Prop({
    minlength: 2,
    maxlength: 10,
  })
  country?: string;

  @Prop({
    default: 0,
  })
  loginAttempts: number;

  @Prop({
    default: Date.now,
  })
  blockExpires: Date;

  @Prop({
    index: true,
  })
  lastLogin?: Date;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: User.name,
  })
  creator: User | Types.ObjectId;

  @Prop({
    type: UserSettingsSchema,
  })
  settings: UserSettings;

  @Prop({ type: [String], default: [] })
  otherPhones?: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.plugin(mongoosePaginate);

UserSchema.index({
  firstName: 'text',
  lastName: 'text',
  userName: 'text',
});
