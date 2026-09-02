import mongoose from 'mongoose';
import dayjs from 'dayjs';
import crypto from 'crypto';
import UserModel, { Role, User } from '../models/User.model';
import CandidateProfileModel from '../models/CandidateProfile.model';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from '../validation/auth.dto';
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

    const userResponse = user.toObject();
    delete (userResponse as any).password;

    return userResponse;
  }

  async forgotPassword(data: ForgotPasswordDto) {
    const user = await UserModel.findOne({ email: data.email });
    if (!user) {
      // Do not reveal if user exists or not
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

    user.password = await hashPassword(data.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
  }
}

export const authService = new AuthService();
