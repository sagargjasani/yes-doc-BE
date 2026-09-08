import mongoose from 'mongoose';
import dayjs from 'dayjs';
import crypto from 'crypto';
import UserModel, { Role, User } from '../models/User.model';
import CandidateProfileModel from '../models/CandidateProfile.model';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from '../validation/auth.dto';
import { hashPassword, comparePassword } from '../utils/password';
import { AppError } from '../utils/AppError';
import { sendPasswordResetEmail } from '../utils/mailer';

export class AuthService {
  async register(data: RegisterDto, currentUser?: User) {
    // 1. Check authorization based on roles
    if (data.role === Role.ADMIN) {
      throw new AppError('Cannot register an admin user through this endpoint.', 403);
    }

    if ((data.role === Role.CONSULTANT || data.role === Role.COMPLIANCE) && currentUser?.role !== Role.ADMIN) {
      throw new AppError(`Only admins can register ${data.role}s.`, 403);
    }

    if (data.role === Role.CANDIDATE && !currentUser) {
      throw new AppError('Must be logged in to register a candidate.', 401);
    }

    // 2. Check if email already exists
    const existingUser = await UserModel.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }

    const hashedPassword = await hashPassword(data.password);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 3. Create the User
      const [newUser] = await UserModel.create([{
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        email: data.email,
        mobile: data.mobile,
        password: hashedPassword,
        role: data.role,
      }], { session });

      // 4. Create CandidateProfile if role is Candidate
      if (data.role === Role.CANDIDATE) {
        await CandidateProfileModel.create([{
          user: newUser._id,
          firstName: newUser.firstName,
          middleName: newUser.middleName,
          lastName: newUser.lastName,
          email: newUser.email,
          mobile: newUser.mobile,
          joiningDate: data.joiningDate,
          consultant: data.consultant || null,
          relationship: data.relationship,
        }] as any, { session });
      }

      await session.commitTransaction();

      const userResponse = newUser.toObject();
      delete (userResponse as any).password;

      return userResponse;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async login(data: LoginDto) {
    const user = await UserModel.findOne({ email: data.email }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await comparePassword(data.password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.isActive === false) {
      throw new AppError('Your account has been deactivated. Please contact an administrator.', 403);
    }

    const userResponse = user.toObject();
    delete (userResponse as any).password;

    return userResponse;
  }

  async forgotPassword(data: ForgotPasswordDto) {
    const user = await UserModel.findOne({ email: data.email });
    if (!user || user.isActive === false) {
      // Do not reveal if user exists or is inactive
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hash;
    // Token valid for 1 hour
    user.resetPasswordExpires = dayjs().add(1, 'hour').toDate();
    await user.save();

    await sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(data: ResetPasswordDto) {
    const hash = crypto.createHash('sha256').update(data.token).digest('hex');

    const user = await UserModel.findOne({
      resetPasswordToken: hash,
      resetPasswordExpires: { $gt: dayjs().toDate() },
    });

    if (!user) {
      throw new AppError('Token is invalid or has expired', 400);
    }

    if (user.isActive === false) {
      throw new AppError('Your account has been deactivated. Please contact an administrator.', 403);
    }

    user.password = await hashPassword(data.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (data.email && data.email !== user.email) {
      const existingEmail = await UserModel.findOne({ email: data.email, _id: { $ne: userId } });
      if (existingEmail) {
        throw new AppError('A user with this email already exists', 400);
      }
      user.email = data.email;
    }

    if (data.mobile && data.mobile !== user.mobile) {
      const existingMobile = await UserModel.findOne({ mobile: data.mobile, _id: { $ne: userId } });
      if (existingMobile) {
        throw new AppError('A user with this mobile number already exists', 400);
      }
      user.mobile = data.mobile;
    }

    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.middleName !== undefined) user.middleName = data.middleName;
    if (data.lastName !== undefined) user.lastName = data.lastName;

    await user.save();

    const userResponse = user.toObject();
    delete (userResponse as any).password;
    return userResponse;
  }

  async changePassword(userId: string, data: ChangePasswordDto) {
    const user = await UserModel.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await comparePassword(data.currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = await hashPassword(data.newPassword);
    await user.save();

    return { message: 'Password changed successfully' };
  }
}

export const authService = new AuthService();
