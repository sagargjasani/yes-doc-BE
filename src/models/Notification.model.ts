import { prop, getModelForClass, Ref } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { User } from './User.model';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type NotificationActionType = 'NAVIGATE' | 'DRAWER' | 'CUSTOM';

export class NotificationAction {
  @prop({ required: true, type: String, enum: ['NAVIGATE', 'DRAWER', 'CUSTOM'] })
  public type!: NotificationActionType;

  @prop({ type: String })
  public url?: string;

  @prop({ type: String })
  public drawer?: string;

  @prop({ type: Object })
  public payload?: Record<string, any>;
}

export class Notification extends TimeStamps {
  @prop({ ref: () => User, required: true, index: true })
  public user!: Ref<User>;

  @prop({ required: true, type: String, trim: true })
  public title!: string;

  @prop({ required: true, type: String, trim: true })
  public message!: string;

  @prop({ required: true, type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' })
  public type!: NotificationType;

  @prop({ _id: false, type: () => NotificationAction })
  public action?: NotificationAction;

  @prop({ type: Boolean, default: false, index: true })
  public isRead!: boolean;

  @prop({ type: Date })
  public readAt?: Date;
}

const NotificationModel = getModelForClass(Notification, {
  schemaOptions: { timestamps: true },
});

export default NotificationModel;
