import { prop, getModelForClass } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { formatName } from '../utils/formatters';

export enum Role {
  ADMIN = 'admin',
  CONSULTANT = 'consultant',
  COMPLIANCE = 'compliance',
  CANDIDATE = 'candidate',
}

export class User extends TimeStamps {
  @prop({ type: () => String, required: true, trim: true, set: formatName })
  public firstName!: string;

  @prop({ type: () => String, trim: true, set: formatName })
  public middleName?: string;

  @prop({ type: () => String, required: true, trim: true, set: formatName })
  public lastName!: string;

  @prop({ type: () => String, required: true, unique: true, trim: true, lowercase: true })
  public email!: string;

  @prop({ type: () => String, required: true, unique: true, trim: true })
  public mobile!: string;

  @prop({ type: () => String, required: true, select: false }) // Do not return password by default
  public password!: string;

  @prop({ type: () => String, select: false })
  public resetPasswordToken?: string;

  @prop({ type: () => Date, select: false })
  public resetPasswordExpires?: Date;

  @prop({ required: true, enum: Role, type: String })
  public role!: Role;
}

const UserModel = getModelForClass(User, { schemaOptions: { timestamps: true } });
export default UserModel;
