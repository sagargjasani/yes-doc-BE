import { prop, getModelForClass, Ref } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { CandidateProfile } from './CandidateProfile.model';

export type ReferenceFormStatus = 'NOT_SENT' | 'SENT' | 'SUBMITTED' | 'APPROVED';

export class ReferenceForm extends TimeStamps {
  @prop({ ref: () => CandidateProfile, required: true })
  public candidate!: Ref<CandidateProfile>;

  @prop({ type: () => Number, required: true, enum: [1, 2] })
  public refereeIndex!: number;

  @prop({ type: () => String, required: true, trim: true })
  public refereeName!: string;

  @prop({ type: () => String, required: true, trim: true, lowercase: true })
  public refereeEmail!: string;

  @prop({ type: () => String, trim: true })
  public refereeCompany?: string;

  @prop({ type: () => String, trim: true })
  public refereeRelationship?: string;

  @prop({ type: () => String, trim: true })
  public refereeMobile?: string;

  @prop({ type: () => String, required: true, unique: true })
  public token!: string;

  @prop({ type: () => Date, required: true })
  public tokenExpiresAt!: Date;

  @prop({
    type: () => String,
    enum: ['NOT_SENT', 'SENT', 'SUBMITTED', 'APPROVED'],
    default: 'NOT_SENT',
  })
  public status!: ReferenceFormStatus;

  @prop({ type: () => String })
  public rejectionReason?: string;

  // Flattened Reference Form Fields
  @prop({ type: () => String })
  public candidateName?: string;

  @prop({ type: () => Date })
  public startDate?: Date;

  @prop({ type: () => Date })
  public endDate?: Date;

  @prop({ type: () => String })
  public positionHeld?: string;

  // 2. Clinical Skills Assessment
  @prop({ type: () => String, enum: ['Yes', 'No'] })
  public basicNursingCare?: string;

  @prop({ type: () => String, enum: ['Yes', 'No'] })
  public clinicalSkills?: string;

  @prop({ type: () => String, enum: ['Yes', 'No'] })
  public drugAdministration?: string;

  @prop({ type: () => String, enum: ['Yes', 'No'] })
  public assessPatientNeeds?: string;

  @prop({ type: () => String, enum: ['Yes', 'No'] })
  public patientRecords?: string;

  // 3. Professional Attributes
  @prop({ type: () => String, enum: ['Excellent', 'Good', 'Average', 'Poor', 'N/A'] })
  public attitude?: string;

  @prop({ type: () => String, enum: ['Excellent', 'Good', 'Average', 'Poor', 'N/A'] })
  public reliability?: string;

  @prop({ type: () => String, enum: ['Excellent', 'Good', 'Average', 'Poor', 'N/A'] })
  public timeKeeping?: string;

  @prop({ type: () => String, enum: ['Excellent', 'Good', 'Average', 'Poor', 'N/A'] })
  public supervisorySkills?: string;

  @prop({ type: () => String, enum: ['Excellent', 'Good', 'Average', 'Poor', 'N/A'] })
  public organisationalAbility?: string;

  // 4. Knowledge & Competence
  @prop({ type: () => String, enum: ['Yes', 'No'] })
  public basicDiseasesUnderstanding?: string;

  @prop({ type: () => String, enum: ['Yes', 'No'] })
  public clinicalProceduresKnowledge?: string;

  @prop({ type: () => String, enum: ['Yes', 'No'] })
  public recogniseOwnLimitations?: string;

  // 5. Employment & Conduct
  @prop({ type: () => String })
  public sicknessAbsenceRecord?: string;

  @prop({ type: () => String, enum: ['Yes', 'No'] })
  public hasDisciplinaryIncidents?: string;

  @prop({ type: () => String })
  public disciplinaryIncidentsDetails?: string;

  @prop({ type: () => String, enum: ['Yes', 'No'] })
  public wouldReemploy?: string;

  @prop({ type: () => String })
  public reemployDetails?: string;

  @prop({ type: () => String, enum: ['Yes', 'No'] })
  public fitnessToPractiseConcerns?: string;

  @prop({ type: () => String })
  public fitnessToPractiseDetails?: string;

  @prop({ type: () => String })
  public furtherInformation?: string;

  // 6. Appraisal & Revalidation Statement
  @prop({ type: () => String, enum: ['Yes', 'No'] })
  public permissionForAppraisal?: string;

  // 7. Referee & Organisation Details
  @prop({ type: () => String })
  public refereeContactNumber?: string;

  @prop({ type: () => String })
  public signatureS3Key?: string;

  @prop({ type: () => Date })
  public date?: Date;

  @prop({ type: () => String })
  public organisationName?: string;

  @prop({ type: () => String })
  public organisationAddress?: string;

  @prop({ type: () => Date })
  public sentAt?: Date;

  @prop({ type: () => Date })
  public submittedAt?: Date;

  @prop({ type: () => Date })
  public reviewedAt?: Date;
}

const ReferenceFormModel = getModelForClass(ReferenceForm, {
  schemaOptions: { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
});

export default ReferenceFormModel;
