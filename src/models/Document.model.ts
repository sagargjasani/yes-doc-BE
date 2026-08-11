import { prop, getModelForClass, Ref } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { CandidateProfile } from './CandidateProfile.model';

export class Document extends TimeStamps {
  @prop({ ref: () => CandidateProfile, required: true })
  public candidate!: Ref<CandidateProfile>;

  @prop({ type: () => String, required: true, unique: true })
  public s3Key!: string;

  @prop({ type: () => String, required: true })
  public documentName!: string;

  @prop({ type: () => String, required: true })
  public originalName!: string;

  @prop({ type: () => String, required: true })
  public mimeType!: string;

  @prop({ type: () => String, enum: ['Document', 'Profile', 'Form'], required: true })
  public category!: string;

  @prop({ type: () => Number, required: true })
  public size!: number;
}

const DocumentModel = getModelForClass(Document, {
  schemaOptions: { timestamps: true }
});

export default DocumentModel;
