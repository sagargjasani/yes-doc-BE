import { IsEmail, IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Role } from '../models/User.model';

export enum ManageableRole {
  ADMIN = Role.ADMIN,
  CONSULTANT = Role.CONSULTANT,
  COMPLIANCE = Role.COMPLIANCE,
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  mobile!: string;

  @IsEnum(ManageableRole, { message: 'Role must be either admin, consultant, or compliance' })
  @IsNotEmpty({ message: 'Role is required' })
  role!: ManageableRole;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsEnum(ManageableRole, { message: 'Role must be either admin, consultant, or compliance' })
  @IsOptional()
  role?: ManageableRole;
}

export class UpdateUserStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class GetUsersQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;
}
