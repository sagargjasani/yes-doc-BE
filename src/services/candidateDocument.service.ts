import { DocumentType } from '@typegoose/typegoose';
import dayjs from 'dayjs';
import CandidateProfileModel, { CandidateProfile, DocumentStatus, VisaType } from '../models/CandidateProfile.model';
import DocumentModel, { DocumentCategory, ReviewStatus } from '../models/Document.model';
import { getApplicableRequiredDocuments, visaTypeOptions } from '../constants/allDocumentsList';
import { Role } from '../models/User.model';
import { deleteS3File, getCandidateS3Key } from './s3.service';
import { AppError } from '../utils/AppError';

/** Candidates uploading against a Required Document follow the Upload rules; staff uploads do not. */
export const isRequiredDocumentUpload = (role: Role, category: string) =>
  role === Role.CANDIDATE && category === DocumentCategory.DOCUMENT;

export interface ConfirmedUpload {
  s3Key: string;
  originalName: string;
  mimeType: string;
  size: number;
  documentName: string;
}

const documentStatusOf = (profile: CandidateProfile) => profile.documentStatus ?? DocumentStatus.NOT_SUBMITTED;

// Matches profiles whose Candidate Documents can still change (older profiles have no documentStatus)
const EDITABLE_STATUS_FILTER = {
  $or: [
    { documentStatus: { $in: [DocumentStatus.NOT_SUBMITTED, DocumentStatus.CHANGES_REQUIRED] } },
    { documentStatus: { $exists: false } },
  ],
};

/** Candidate Documents can change only while the set is Not Submitted or Changes Required. */
const assertDocumentsEditable = (profile: CandidateProfile) => {
  const status = documentStatusOf(profile);
  if (status === DocumentStatus.SUBMITTED) {
    throw new AppError('Your documents are under review and cannot be changed', 409);
  }
  if (status === DocumentStatus.APPROVED) {
    throw new AppError('Your documents have been approved and cannot be changed', 409);
  }
};

// Candidate Documents must be previewable by Reviewers (PDF inline, images as images).
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export interface CandidateDocumentSummary {
  _id: string;
  originalName: string;
  mimeType: string;
  reviewStatus: ReviewStatus;
  rejectionReason: string | null;
  updatedAt?: Date;
}

export interface ChecklistItem {
  key: string;
  label: string;
  hint: string | null;
  document: CandidateDocumentSummary | null;
}

export interface DocumentChecklist {
  visaType: VisaType | null;
  documentStatus: DocumentStatus;
  visaTypeOptions: typeof visaTypeOptions;
  checklist: ChecklistItem[];
}

export class CandidateDocumentService {
  /** The Candidate's profile, only once their application form is approved. */
  private async getApprovedProfile(userId: string) {
    const profile = await CandidateProfileModel.findOne({ user: userId });
    if (!profile) {
      throw new AppError('Candidate profile not found', 404);
    }
    if (profile.applicationStatus !== 'APPLICATION_FORM_APPROVED') {
      throw new AppError('Documents can only be uploaded once your application form is approved', 403);
    }
    return profile;
  }

  private async buildChecklist(profile: DocumentType<CandidateProfile>): Promise<DocumentChecklist> {
    const { visaType } = profile;
    const requiredDocuments = getApplicableRequiredDocuments(visaType);

    const documents = await DocumentModel.find({
      candidate: profile._id,
      category: DocumentCategory.DOCUMENT,
      documentName: { $in: requiredDocuments.map((doc) => doc.key) },
    });
    const documentsByKey = new Map(documents.map((doc) => [doc.documentName, doc]));

    return {
      visaType: visaType ?? null,
      documentStatus: documentStatusOf(profile),
      visaTypeOptions,
      checklist: requiredDocuments.map(({ key, label, hint }) => {
        const doc = documentsByKey.get(key);
        return {
          key,
          label,
          hint,
          document: doc
            ? {
                _id: doc._id.toString(),
                originalName: doc.originalName,
                mimeType: doc.mimeType,
                reviewStatus: doc.reviewStatus,
                rejectionReason: doc.rejectionReason ?? null,
                updatedAt: doc.updatedAt,
              }
            : null,
        };
      }),
    };
  }

  async getMyChecklist(userId: string): Promise<DocumentChecklist> {
    const profile = await this.getApprovedProfile(userId);
    return this.buildChecklist(profile);
  }

  /** The Candidate's own profile, once every Upload rule allows this file for this Required Document. */
  async prepareUpload(userId: string, documentName: string, mimeType: string) {
    const profile = await this.getApprovedProfile(userId);
    assertDocumentsEditable(profile);

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new AppError('Only PDF, JPG and PNG files are accepted', 400);
    }
    if (!profile.visaType) {
      throw new AppError('Choose your visa type before uploading documents', 400);
    }
    const isApplicable = getApplicableRequiredDocuments(profile.visaType).some((doc) => doc.key === documentName);
    if (!isApplicable) {
      throw new AppError('This document is not required for your visa type', 400);
    }

    return profile;
  }

  /**
   * Records a completed Upload: replaces the Candidate Document for this Required Document
   * (deleting the previous file) and puts it back to Pending for review.
   */
  async confirmUpload(userId: string, upload: ConfirmedUpload) {
    const { s3Key, originalName, mimeType, size, documentName } = upload;
    const profile = await this.prepareUpload(userId, documentName, mimeType);

    // The key must be the one presign issued for this Candidate and Required Document
    const expectedKeyPrefix = `${getCandidateS3Key(profile._id.toString(), DocumentCategory.DOCUMENT, documentName)}.`;
    if (typeof s3Key !== 'string' || !s3Key.startsWith(expectedKeyPrefix)) {
      throw new AppError('Uploaded file does not match this document', 400);
    }

    const filter = { candidate: profile._id, category: DocumentCategory.DOCUMENT, documentName };
    const existing = await DocumentModel.findOne(filter);
    if (existing && existing.s3Key !== s3Key) {
      await deleteS3File(existing.s3Key);
    }

    return DocumentModel.findOneAndUpdate(
      filter,
      {
        s3Key,
        originalName,
        mimeType,
        size,
        reviewStatus: ReviewStatus.PENDING,
        rejectionReason: null,
      },
      { new: true, upsert: true }
    );
  }

  async setMyVisaType(userId: string, visaType: VisaType): Promise<DocumentChecklist> {
    const profile = await this.getApprovedProfile(userId);
    // Locked from the first Document Submission: Reviewers approve documents against it
    if (documentStatusOf(profile) !== DocumentStatus.NOT_SUBMITTED) {
      throw new AppError('Your visa type cannot be changed after submitting your documents', 409);
    }
    // Targeted update: don't re-validate unrelated (possibly legacy) profile fields
    await CandidateProfileModel.updateOne({ _id: profile._id }, { $set: { visaType } });
    profile.visaType = visaType;
    return this.buildChecklist(profile);
  }

  /** Document Submission: hands the full set of applicable Candidate Documents over for review. */
  async submitMyDocuments(userId: string): Promise<DocumentChecklist> {
    const profile = await this.getApprovedProfile(userId);
    assertDocumentsEditable(profile);

    if (!profile.visaType) {
      throw new AppError('Choose your visa type before submitting your documents', 400);
    }

    const { checklist } = await this.buildChecklist(profile);
    const missing = checklist.filter((item) => !item.document).map((item) => item.label);
    if (missing.length > 0) {
      throw new AppError(`Please upload all required documents before submitting. Missing: ${missing.join(', ')}`, 400);
    }

    // Conditional on the status still being editable, so simultaneous Submissions can't both succeed
    const submittedAt = dayjs().toDate();
    const { modifiedCount } = await CandidateProfileModel.updateOne(
      { _id: profile._id, ...EDITABLE_STATUS_FILTER },
      { $set: { documentStatus: DocumentStatus.SUBMITTED, documentsSubmittedAt: submittedAt } }
    );
    if (modifiedCount === 0) {
      throw new AppError('Your documents have already been submitted', 409);
    }
    profile.documentStatus = DocumentStatus.SUBMITTED;
    profile.documentsSubmittedAt = submittedAt;

    return this.buildChecklist(profile);
  }

  /** Candidates awaiting a Reviewer: Document Status Submitted, oldest Submission first. */
  async listSubmitted() {
    return CandidateProfileModel.find({ documentStatus: DocumentStatus.SUBMITTED })
      .sort({ documentsSubmittedAt: 1 })
      .select('firstName middleName lastName email mobile appliedFor documentsSubmittedAt')
      .lean();
  }
}

export const candidateDocumentService = new CandidateDocumentService();
