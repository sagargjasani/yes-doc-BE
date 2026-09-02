import mongoose from 'mongoose';
import dayjs from 'dayjs';
import crypto from 'crypto';
import UserModel, { Role } from '../models/User.model';
import CandidateProfileModel from '../models/CandidateProfile.model';
import { AddCandidateDto } from '../validation/candidate.dto';
import { hashPassword } from '../utils/password';
import { AppError } from '../utils/AppError';
import { sendCreatePasswordEmail, sendApplicationApprovedEmail, sendApplicationChangesRequiredEmail } from '../utils/mailer';
import DocumentModel, { DocumentCategory } from '../models/Document.model';
import fse from "fs-extra";
import { downloadS3File, generatePresignedGetUrl, uploadS3File, getCandidateS3Key } from './s3.service';
import { formatDates } from '../utils/formatters';
import { generateDocx } from '../utils/docx';
import { applicationFormsList } from '../constants/applicationFormsList';

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
      newUser.resetPasswordExpires = dayjs().add(24, 'hour').toDate(); // 24 hours
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
    user.resetPasswordExpires = dayjs().add(24, 'hour').toDate(); // 24 hours
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

  async getSubmittedApplicationForms() {
    const profiles = await CandidateProfileModel.find({ applicationStatus: 'APPLICATION_FORM_SUBMITTED' })
      .populate('consultant', 'firstName lastName email')
      .select('firstName middleName lastName consultant updatedAt applicationStatus');
    return profiles;
  }

  async getApplicationFormById(id: string) {
    const profile = await CandidateProfileModel.findById(id).populate('consultant', 'firstName lastName email');
    if (!profile) {
      throw new AppError('Candidate profile not found', 404);
    }

    const signatureDoc = await DocumentModel.findOne({
      candidate: id,
      documentName: 'signature'
    });

    let signatureUrl = null;
    if (signatureDoc) {
      signatureUrl = await generatePresignedGetUrl(signatureDoc.s3Key);
    }

    return {
      ...profile.toJSON(),
      signature: signatureUrl
    };
  }

  async approveApplicationForm(id: string) {
    try {
      const profile = await CandidateProfileModel.findById(id);
      if (!profile) {
        throw new AppError('Candidate profile not found', 404);
      }

      const singatureKey = await DocumentModel.findOne({
        candidate: id,
        documentName: 'signature'
      });
      if (!singatureKey) {
        throw new AppError('Signature not found', 404);
      }

      const signatureBuffer = await downloadS3File(singatureKey.s3Key);
      const signPath = `./temps/${id}/sign.png`;

      await fse.outputFile(signPath, signatureBuffer);

      profile.applicationApproveDate = new Date();

      const profileData = formatDates({
        ...profile.toJSON(),
        signature: signPath,
      });


      for (const form of applicationFormsList) {
        const docxBuffer = await generateDocx({
          templatePath: form.templatePath,
          data: profileData,
        });
        const s3Key = getCandidateS3Key(id, DocumentCategory.FORM, form.s3FileName);
        await uploadS3File(
          s3Key,
          docxBuffer,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        await DocumentModel.findOneAndUpdate(
          { candidate: id, category: DocumentCategory.FORM, documentName: form.documentName },
          {
            candidate: id,
            s3Key,
            originalName: form.originalName,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            category: DocumentCategory.FORM,
            size: docxBuffer.length,
          },
          { upsert: true, new: true }
        );
        await fse.writeFile(`./temps/${id}/${form.s3FileName}`, docxBuffer);
      }

      fse.rmSync(`./temps/${id}`, { recursive: true, force: true });

      profile.applicationStatus = 'APPLICATION_FORM_APPROVED';
      await profile.save();

      await sendApplicationApprovedEmail(profile.email);
      return profile;
    } catch (error) {
      console.log("Error in candidateService.approveApplicationForm :>> ", error);
      throw error;
    }
  }

  async requestApplicationFormChanges(id: string, reason: string) {
    const profile = await CandidateProfileModel.findById(id);
    if (!profile) {
      throw new AppError('Candidate profile not found', 404);
    }

    profile.applicationStatus = 'APPLICATION_FORM_SENT';
    await profile.save();

    await sendApplicationChangesRequiredEmail(profile.email, reason);
    return profile;
  }

  async searchCandidates(q: string, page = 1, limit = 10) {
    const trimmedQ = q.trim();
    if (!trimmedQ || trimmedQ.length < 3) {
      return {
        candidates: [],
        pagination: {
          total: 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: 0,
          hasNextPage: false,
        },
      };
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const regex = new RegExp(trimmedQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const filter = {
      $or: [
        { firstName: { $regex: regex } },
        { lastName: { $regex: regex } },
        { email: { $regex: regex } },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: trimmedQ,
              options: 'i',
            },
          },
        },
      ],
    };

    const total = await CandidateProfileModel.countDocuments(filter);
    const candidates = await CandidateProfileModel.find(filter)
      .populate('consultant', 'firstName lastName email')
      .select('firstName middleName lastName email mobile consultant applicationStatus location appliedFor createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum);

    return {
      candidates,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
      },
    };
  }

  async getCandidateById(id: string) {
    const profile = await CandidateProfileModel.findById(id).populate('consultant', 'firstName lastName email mobile');
    if (!profile) {
      throw new AppError('Candidate profile not found', 404);
    }
    return profile;
  }

  async updateCandidateProfile(id: string, updateData: any) {
    const profile = await CandidateProfileModel.findById(id);
    if (!profile) {
      throw new AppError('Candidate profile not found', 404);
    }

    delete updateData._id;
    delete updateData.user;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    Object.assign(profile, updateData);
    await profile.save();

    if (
      updateData.firstName ||
      updateData.lastName ||
      updateData.email ||
      updateData.mobile ||
      updateData.middleName !== undefined
    ) {
      const userUpdate: Record<string, any> = {};
      if (updateData.firstName) userUpdate.firstName = updateData.firstName;
      if (updateData.lastName) userUpdate.lastName = updateData.lastName;
      if (updateData.email) userUpdate.email = updateData.email;
      if (updateData.mobile) userUpdate.mobile = updateData.mobile;
      if (updateData.middleName !== undefined) userUpdate.middleName = updateData.middleName;

      await UserModel.findByIdAndUpdate(profile.user, userUpdate);
    }

    return CandidateProfileModel.findById(id).populate('consultant', 'firstName lastName email mobile');
  }
}

export const candidateService = new CandidateService();
