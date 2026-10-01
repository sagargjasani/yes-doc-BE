import { IsArray, IsEnum, IsIn, IsMongoId, IsNotEmpty, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ReviewStatus } from '../models/Document.model';
import { VisaType } from '../models/CandidateProfile.model';

export class SetVisaTypeDto {
  @IsEnum(VisaType)
  visaType!: VisaType;
}

export class ReviewDecisionDto {
  @IsMongoId()
  documentId!: string;

  @IsIn([ReviewStatus.APPROVED, ReviewStatus.REJECTED])
  status!: ReviewStatus.APPROVED | ReviewStatus.REJECTED;

  // Required, and not blank, when the document is rejected
  @ValidateIf((decision: ReviewDecisionDto) => decision.status === ReviewStatus.REJECTED)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'A rejection reason is required for every rejected document' })
  rejectionReason?: string;
}

export class ReviewDocumentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewDecisionDto)
  decisions!: ReviewDecisionDto[];
}
