import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsString,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrainingType } from '../models/CandidateTrainings.model';

export class UpdateSingleTrainingDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TrainingType)
  type?: TrainingType | null;

  @IsOptional()
  @IsDateString()
  date?: string | null;
}

export class UpdatePracticalOnlyTrainingDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn([TrainingType.PRACTICAL], {
    message: 'Moving and Handling training must be PRACTICAL only',
  })
  type?: TrainingType | null;

  @IsOptional()
  @IsDateString()
  date?: string | null;
}

export class UpdateCandidateTrainingsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  autismAwareness?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  basicLifeSupport?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  complaintsHandling?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  conflictManagement?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  coronavirusAwareness?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  coshh?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  cpiTraining?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  dementiaAwareness?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  dignityAndRespect?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  dysphagiaCare?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  emergencyFirstAidAtWork?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  endOfLifeCare?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  epilepsyAwareness?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  equalityAndDiversity?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  fallsPrevention?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  fireSafety?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  foodAllergensAwareness?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  foodHygiene?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  foodSafetyAndNutrition?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  gdprAndDataProtection?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  healthAndSafety?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  immediateLifeSupport?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  infectionPreventionAndControl?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  informationGovernance?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  learningDisabilitiesAwareness?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  managingChallengingBehaviours?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  mayboLevel2?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  mcaDols?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  medicationAdministration?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  mentalHealthAwareness?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePracticalOnlyTrainingDto)
  movingAndHandling?: UpdatePracticalOnlyTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  personalCare?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  pmva?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  privacyAndDignity?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  promotingPersonCenteredCare?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  riddor?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  safeguarding?: UpdateSingleTrainingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSingleTrainingDto)
  whistleblowing?: UpdateSingleTrainingDto;
}
