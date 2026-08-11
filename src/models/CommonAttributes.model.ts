import { prop, getModelForClass, index } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';

export enum CommonAttributeKey {
  APPLIED_FOR = 'appliedFor',
  LOCATION = 'location',
}

@index({ key: 1, value: 1 }, { unique: true })
export class CommonAttributes extends TimeStamps {
  @prop({ required: true, enum: CommonAttributeKey, type: String })
  public key!: CommonAttributeKey;

  @prop({ type: () => String, required: true, trim: true })
  public value!: string;
}

const CommonAttributesModel = getModelForClass(CommonAttributes, { schemaOptions: { timestamps: true } });
export default CommonAttributesModel;
