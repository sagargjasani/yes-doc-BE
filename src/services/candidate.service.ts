import mongoose from 'mongoose';
import crypto from 'crypto';
import UserModel, { Role } from '../models/User.model';
import CandidateProfileModel from '../models/CandidateProfile.model';
import { AddCandidateDto } from '../validation/candidate.dto';
import { hashPassword } from '../utils/password';
import { AppError } from '../utils/AppError';
import { sendCreatePasswordEmail } from '../utils/mailer';

export class CandidateService {
  async addCandidate(data: AddCandidateDto) {
    // Check if email already exists
    const existingUser = await UserModel.findOne({ email: data.email });
    if (existingUser) {
      throw new AppError('Email already in use', 400);
    }

    // Generate a secure random dummy password and hash it
    const dummyPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await hashPassword(dummyPassword);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Create the User
      const [newUser] = await UserModel.create([{
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        email: data.email,
        mobile: data.mobile,
        password: hashedPassword,
        role: Role.CANDIDATE,
      }], { session });

      // 2. Create CandidateProfile
      const candidateProfile = await CandidateProfileModel.create([{
        user: newUser._id,
        firstName: newUser.firstName,
        middleName: newUser.middleName,
        lastName: newUser.lastName,
        email: newUser.email,
        mobile: newUser.mobile,
        consultant: data.consultant || null,
        appliedFor: data.appliedFor,
        location: data.location,
        applicationStatus: "INITIATED"
      }] as any, { session });

      // 3. Generate setup password token (valid for 24 hours)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(resetToken).digest('hex');

      newUser.resetPasswordToken = hash;
      newUser.resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await newUser.save({ session });

      await session.commitTransaction();

      // 4. Send email (outside of transaction since it's external)
      if (data.sendRegistrationLink) {
        await sendCreatePasswordEmail(newUser.email, resetToken);
      }

      const userResponse = newUser.toObject();
      delete (userResponse as any).password;
      delete (userResponse as any).resetPasswordToken;
      delete (userResponse as any).resetPasswordExpires;

      return userResponse;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async sendRegistrationLink(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Generate setup password token (valid for 24 hours)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hash;
    user.resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await CandidateProfileModel.findOneAndUpdate({ user: userId }, { applicationStatus: "APPLICATION_FORM_SENT" });
    await user.save();

    await sendCreatePasswordEmail(user.email, resetToken);
  }

  async getMe(userId: string) {
    const profile = await CandidateProfileModel.findOne({ user: userId }).populate('consultant', 'firstName lastName email');
    if (!profile) {
      throw new AppError('Candidate profile not found', 404);
    }
    return profile;
  }

  async submitApplicationForm(userId: string, applicationData: any) {
    // Basic update for now, ideally we should validate this data
    const profile = await CandidateProfileModel.findOne({ user: userId });
    if (!profile) {
      throw new AppError('Candidate profile not found', 404);
    }

    // Set fields from applicationData
    Object.assign(profile, applicationData);

    // Explicitly update status
    profile.applicationStatus = 'APPLICATION_FORM_SUBMITTED';

    await profile.save();
    return profile;
  }
}

export const candidateService = new CandidateService();
