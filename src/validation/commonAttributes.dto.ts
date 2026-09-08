import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { CommonAttributeKey } from '../models/CommonAttributes.model';

export class CreateCommonAttributeDto {
  @IsEnum(CommonAttributeKey, {
    message: `Key must be one of: ${Object.values(CommonAttributeKey).join(', ')}`,
  })
  key!: CommonAttributeKey;

  @IsString()
  @IsNotEmpty({ message: 'Value is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  value!: string;
}

export class UpdateCommonAttributeDto {
  @IsString()
  @IsNotEmpty({ message: 'Value is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  value!: string;
}
