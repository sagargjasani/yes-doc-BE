import { prop, getModelForClass, Ref } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { CandidateProfile } from './CandidateProfile.model';

export enum DocumentCategory {
  DOCUMENT = 'Document',
  PROFILE = 'Profile',
  FORM = 'Form',
}

export type TDocumentCategoryValue = `${DocumentCategory}`;

export const documentCategoryValues: DocumentCategory[] = Object.values(DocumentCategory);

export class Document extends TimeStamps {
  @prop({ ref: () => CandidateProfile, required: true })
  public candidate!: Ref<CandidateProfile>;

  @prop({ type: () => String, required: true, unique: true })
  public s3Key!: string;

  @prop({ type: () => String, required: true })
  public documentName!: string;

  @prop({ type: () => String, required: true })
  public originalName!: string; // Used to displayy in FE

  @prop({ type: () => String, required: true })
  public mimeType!: string;

  @prop({ type: () => String, enum: DocumentCategory, required: true })
  public category!: DocumentCategory;

  @prop({ type: () => Number, required: true })
  public size!: number;
}

const DocumentModel = getModelForClass(Document, {
  schemaOptions: { timestamps: true }
});

export default DocumentModel;
