import { IsEmail, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddCandidateDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @IsNotEmpty()
  mobile!: string;

  @IsString()
  @IsNotEmpty()
  consultant!: string; // Consultant User ID

  @IsString()
  @IsNotEmpty()
  appliedFor!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsOptional()
  sendRegistrationLink?: boolean;
}

export class SendRegistrationLinkDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;
}

export class RequestChangesDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
