import { IsEnum } from 'class-validator';
import { VisaType } from '../models/CandidateProfile.model';

export class SetVisaTypeDto {
  @IsEnum(VisaType)
  visaType!: VisaType;
}
