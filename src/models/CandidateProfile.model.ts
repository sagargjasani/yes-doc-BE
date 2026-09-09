import { prop, getModelForClass, Ref } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { User } from './User.model';
import { formatName } from '../utils/formatters';

export class CandidateProfile extends TimeStamps {
  @prop({ ref: () => User, required: true, unique: true })
  public user!: Ref<User>;

  @prop({ type: () => String, required: true, trim: true, set: formatName })
  public firstName!: string;

  @prop({ type: () => String, trim: true, set: formatName })
  public middleName?: string;

  @prop({ type: () => String, required: true, trim: true, set: formatName })
  public lastName!: string;

  @prop({ type: () => String, required: true, unique: true, trim: true, lowercase: true })
  public email!: string;

  @prop({ type: () => String, required: true, trim: true })
  public mobile!: string;

  // @prop({ type: () => Date })
  // public joiningDate?: Date;

  @prop({ ref: () => User, default: null })
  public consultant?: Ref<User> | null;

  @prop({ type: () => String, default: null })
  public appliedFor?: string;

  @prop({ type: () => String, default: null })
  public location?: string;

  @prop({ type: () => String })
  public niNumber?: string;

  @prop({ type: () => String })
  public vacancySource?: string;

  @prop({ type: () => String, enum: ['High', 'Moderate', 'Low'] })
  public englishProficiency?: string;

  @prop({ type: () => String, enum: ['YES', 'NO'] })
  public hasDrivingLicence?: string;

  @prop({ type: () => String, enum: ['YES', 'NO'] })
  public ownCar?: string;

  @prop({ type: () => String, enum: ['YES', 'NO'] })
  public isUkResidenceRestrictions?: string;

  @prop({ type: () => String })
  public ukResidenceRestrictions?: string;

  @prop({ type: () => String, enum: ['YES', 'NO'] })
  public hasRightToWork?: string;

  @prop({ type: () => String })
  public requireWorkPermit?: string;

  @prop({ type: () => String })
  public nokName?: string;

  @prop({ type: () => String })
  public nokRelation?: string;

  @prop({ type: () => String })
  public nokAddress?: string;

  @prop({ type: () => String })
  public nokMobile?: string;

  @prop({ type: () => String, trim: true, lowercase: true })
  public nokEmail?: string;

  @prop({ type: () => String, enum: ['YES', 'NO'] })
  public hasPreventAssignments?: string;

  @prop({ type: () => String })
  public preventAssignments?: string;

  @prop({ type: () => Date })
  public applicationDate?: Date;

  @prop({ type: () => Date })
  public applicationApproveDate?: Date;

  @prop({ type: () => String })
  public ref1Name?: string;

  @prop({ type: () => String })
  public ref1Company?: string;

  @prop({ type: () => String })
  public ref1Mobile?: string;

  @prop({ type: () => String })
  public ref1Email?: string;

  @prop({ type: () => String })
  public ref1Relationship?: string;

  @prop({ type: () => String })
  public ref2Name?: string;

  @prop({ type: () => String })
  public ref2Company?: string;

  @prop({ type: () => String })
  public ref2Mobile?: string;

  @prop({ type: () => String })
  public ref2Email?: string;

  @prop({ type: () => String })
  public ref2Relationship?: string;

  @prop({ type: () => String, enum: ['YES', 'NO'] })
  public hasDisability?: string;

  @prop({ type: () => String })
  public disabilityDetails?: string;

  @prop({ type: () => String })
  public workplaceAdjustments?: string;

  @prop({ type: () => Date })
  public earliestStartDate?: Date;

  @prop({ type: () => String })
  public employerRestrictions?: string;

  @prop({ type: () => String, enum: ['YES', 'NO'] })
  public hasPreviouslyApplied?: string;

  @prop({ type: () => String, enum: ['YES', 'NO'] })
  public hasCriminalConvictions?: string;

  @prop({ type: () => String, enum: ['YES', 'NO'] })
  public hasDbsDisqualified?: string;

  @prop({ type: () => String, enum: ['YES', 'NO'] })
  public hasOutstandingOffences?: string;

  @prop({ type: () => String })
  public clinicalScenario1_q1?: string;
  @prop({ type: () => String })
  public clinicalScenario1_q2?: string;
  @prop({ type: () => String })
  public clinicalScenario1_q3?: string;
  @prop({ type: () => String })
  public clinicalScenario1_q4?: string;

  @prop({ type: () => String })
  public clinicalScenario2_q1?: string;
  @prop({ type: () => String })
  public clinicalScenario2_q2?: string;
  @prop({ type: () => String })
  public clinicalScenario2_q3?: string;
  @prop({ type: () => String })
  public clinicalScenario2_q4?: string;

  @prop({ type: () => String })
  public clinicalScenario3_q1?: string;
  @prop({ type: () => String })
  public clinicalScenario3_q2?: string;
  @prop({ type: () => String })
  public clinicalScenario3_q3?: string;
  @prop({ type: () => String })
  public clinicalScenario3_q4?: string;

  @prop({ type: () => String })
  public clinicalScenario4_q1?: string;
  @prop({ type: () => String })
  public clinicalScenario4_q2?: string;
  @prop({ type: () => String })
  public clinicalScenario4_q3?: string;
  @prop({ type: () => String })
  public clinicalScenario4_q4?: string;

  @prop({ type: () => String })
  public clinicalScenario5_q1?: string;
  @prop({ type: () => String })
  public clinicalScenario5_q2?: string;
  @prop({ type: () => String })
  public clinicalScenario5_q3?: string;
  @prop({ type: () => String })
  public clinicalScenario5_q4?: string;

  @prop({ type: () => String })
  public clinicalScenario6_q1?: string;
  @prop({ type: () => String })
  public clinicalScenario6_q2?: string;
  @prop({ type: () => String })
  public clinicalScenario6_q3?: string;
  @prop({ type: () => String })
  public clinicalScenario6_q4?: string;



  @prop({ type: () => [Object], default: [] })
  public qualifications?: { courseName: string; dateCompleted: Date }[];

  @prop({ type: () => String, enum: ['INITIATED', 'APPLICATION_FORM_SENT', 'APPLICATION_FORM_SUBMITTED', 'APPLICATION_FORM_APPROVED'], default: 'INITIATED' })
  public applicationStatus?: string;

  @prop({ type: () => String, enum: ['NOT_SENT', 'SENT', 'SUBMITTED', 'APPROVED'], default: 'NOT_SENT' })
  public referenceStatus?: string;

  public get fullName(): string {
    return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }
}

const CandidateProfileModel = getModelForClass(CandidateProfile, {
  schemaOptions: { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
});
export default CandidateProfileModel;


