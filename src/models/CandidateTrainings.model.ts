import { prop, getModelForClass, Ref, index } from '@typegoose/typegoose';
import { TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { CandidateProfile } from './CandidateProfile.model';

export enum TrainingType {
  PRACTICAL = 'PRACTICAL',
  ONLINE = 'ONLINE',
}

export class SingleTraining {
  @prop({ type: () => String, required: true })
  public name!: string;

  @prop({ type: () => String, enum: TrainingType, default: null })
  public type?: TrainingType | null;

  @prop({ type: () => Date, default: null })
  public date?: Date | null;
}

export const TRAINING_CONFIGS: Record<string, { name: string; requiresPractical?: boolean }> = {
  autismAwareness: { name: 'Autism Awareness' },
  basicLifeSupport: { name: 'Basic Life Support / Basic Life Support (Online) / Basic Life Support & First Aid' },
  complaintsHandling: { name: 'Complaints Handling' },
  conflictManagement: { name: 'Conflict Management' },
  coronavirusAwareness: { name: 'Coronavirus Awareness' },
  coshh: { name: 'COSHH' },
  cpiTraining: { name: 'CPI Training' },
  dementiaAwareness: { name: 'Dementia Awareness' },
  dignityAndRespect: { name: 'Dignity and Respect' },
  dysphagiaCare: { name: 'Dysphagia Care / Dysphasia Training' },
  emergencyFirstAidAtWork: { name: 'Emergency First Aid at Work (including CPR) / First Aid' },
  endOfLifeCare: { name: 'End of Life Care' },
  epilepsyAwareness: { name: 'Epilepsy Awareness' },
  equalityAndDiversity: { name: 'Equality and Diversity' },
  fallsPrevention: { name: 'Falls Prevention' },
  fireSafety: { name: 'Fire Safety' },
  foodAllergensAwareness: { name: 'Food Allergens Awareness' },
  foodHygiene: { name: 'Food Hygiene / Food Hygiene Level 2' },
  foodSafetyAndNutrition: { name: 'Food Safety and Nutrition / Food Safety and Nutrition (Level 3)' },
  gdprAndDataProtection: { name: 'GDPR & Data Protection' },
  healthAndSafety: { name: 'Health and Safety Training / Health and Safety Training (Excluding Risk Assessment)' },
  immediateLifeSupport: { name: 'Immediate Life Support (nursing staff)' },
  infectionPreventionAndControl: { name: 'Infection Prevention and Control' },
  informationGovernance: { name: 'Information Governance' },
  learningDisabilitiesAwareness: { name: 'Learning Disabilities Awareness' },
  managingChallengingBehaviours: { name: 'Managing challenging behaviours (for example; breakaway/escalation training)' },
  mayboLevel2: { name: 'Maybo Level 2' },
  mcaDols: { name: 'MCA/DoLS / Mental Capacity Act & Deprivation of Liberty' },
  medicationAdministration: { name: 'Medication Administration / Medication Administration (with competencies checked) / Medication Administration – SSL schemes Care' },
  mentalHealthAwareness: { name: 'Mental Health Awareness' },
  movingAndHandling: { name: 'Moving and Handling (People and Objects) / Practical & Theory', requiresPractical: true },
  personalCare: { name: 'Personal Care' },
  pmva: { name: 'PMVA' },
  privacyAndDignity: { name: 'Privacy And Dignity in Health and Social Care' },
  promotingPersonCenteredCare: { name: 'Promoting Person Centered Care in Health and Social Care' },
  riddor: { name: 'RIDDOR' },
  safeguarding: { name: 'Safeguarding Vulnerable Adults / Safeguarding Adults and Children' },
  whistleblowing: { name: 'Whistleblowing' },
};

@index({ candidate: 1 }, { unique: true })
export class CandidateTrainings extends TimeStamps {
  @prop({ ref: () => CandidateProfile, required: true, unique: true })
  public candidate!: Ref<CandidateProfile>;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.autismAwareness.name }) })
  public autismAwareness!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.basicLifeSupport.name }) })
  public basicLifeSupport!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.complaintsHandling.name }) })
  public complaintsHandling!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.conflictManagement.name }) })
  public conflictManagement!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.coronavirusAwareness.name }) })
  public coronavirusAwareness!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.coshh.name }) })
  public coshh!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.cpiTraining.name }) })
  public cpiTraining!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.dementiaAwareness.name }) })
  public dementiaAwareness!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.dignityAndRespect.name }) })
  public dignityAndRespect!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.dysphagiaCare.name }) })
  public dysphagiaCare!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.emergencyFirstAidAtWork.name }) })
  public emergencyFirstAidAtWork!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.endOfLifeCare.name }) })
  public endOfLifeCare!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.epilepsyAwareness.name }) })
  public epilepsyAwareness!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.equalityAndDiversity.name }) })
  public equalityAndDiversity!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.fallsPrevention.name }) })
  public fallsPrevention!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.fireSafety.name }) })
  public fireSafety!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.foodAllergensAwareness.name }) })
  public foodAllergensAwareness!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.foodHygiene.name }) })
  public foodHygiene!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.foodSafetyAndNutrition.name }) })
  public foodSafetyAndNutrition!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.gdprAndDataProtection.name }) })
  public gdprAndDataProtection!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.healthAndSafety.name }) })
  public healthAndSafety!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.immediateLifeSupport.name }) })
  public immediateLifeSupport!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.infectionPreventionAndControl.name }) })
  public infectionPreventionAndControl!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.informationGovernance.name }) })
  public informationGovernance!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.learningDisabilitiesAwareness.name }) })
  public learningDisabilitiesAwareness!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.managingChallengingBehaviours.name }) })
  public managingChallengingBehaviours!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.mayboLevel2.name }) })
  public mayboLevel2!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.mcaDols.name }) })
  public mcaDols!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.medicationAdministration.name }) })
  public medicationAdministration!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.mentalHealthAwareness.name }) })
  public mentalHealthAwareness!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.movingAndHandling.name }) })
  public movingAndHandling!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.personalCare.name }) })
  public personalCare!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.pmva.name }) })
  public pmva!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.privacyAndDignity.name }) })
  public privacyAndDignity!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.promotingPersonCenteredCare.name }) })
  public promotingPersonCenteredCare!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.riddor.name }) })
  public riddor!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.safeguarding.name }) })
  public safeguarding!: SingleTraining;

  @prop({ type: () => SingleTraining, default: () => ({ name: TRAINING_CONFIGS.whistleblowing.name }) })
  public whistleblowing!: SingleTraining;
}

export const CandidateTrainingsModel = getModelForClass(CandidateTrainings, {
  schemaOptions: { timestamps: true },
});

export default CandidateTrainingsModel;
