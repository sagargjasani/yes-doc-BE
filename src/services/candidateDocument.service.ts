import { DocumentType } from '@typegoose/typegoose';
import dayjs from 'dayjs';
import { isValidObjectId } from 'mongoose';
import CandidateProfileModel, { CandidateProfile, DocumentStatus, VisaType } from '../models/CandidateProfile.model';
import DocumentModel, { DocumentCategory, ReviewStatus } from '../models/Document.model';
import { getApplicableRequiredDocuments, getVisaTypeLabel, visaTypeOptions } from '../constants/allDocumentsList';
import { Role } from '../models/User.model';
import { deleteS3File, getCandidateS3Key } from './s3.service';
import { sendDocumentChangesRequiredEmail, sendDocumentsApprovedEmail } from '../utils/mailer';
import logger from '../utils/logger';
import type { ReviewDecisionDto } from '../validation/candidateDocument.dto';
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

/** What a Reviewer sees for one Candidate: Pending Candidate Documents first. */
export interface DocumentReviewView {
  visaType: VisaType | null;
  visaTypeLabel: string | null;
  documentStatus: DocumentStatus;
  checklist: ChecklistItem[];
}

// Pending (still to decide) before decided; Required Documents without an Upload last
const reviewOrder = (item: ChecklistItem) => {
  if (!item.document) return 2;
  return item.document.reviewStatus === ReviewStatus.PENDING ? 0 : 1;
};

// Candidate view: Rejected first so they can act on them; otherwise catalogue order (stable sort)
const candidateOrder = (item: ChecklistItem) => (item.document?.reviewStatus === ReviewStatus.REJECTED ? 0 : 1);
const rejectedFirst = (checklist: ChecklistItem[]) => [...checklist].sort((a, b) => candidateOrder(a) - candidateOrder(b));

const alreadyReviewed = () => new AppError('These documents have already been reviewed', 409);

interface ReviewOutcome {
  documentId: string;
  label: string;
  reviewStatus: ReviewStatus.APPROVED | ReviewStatus.REJECTED;
  rejectionReason: string | null;
}

/**
 * One outcome per uploaded Candidate Document, in catalogue order. Every document needs exactly
 * one decision, and decisions may only be for this Candidate's applicable documents.
 */
const matchDecisionsToDocuments = (checklist: ChecklistItem[], decisions: ReviewDecisionDto[]): ReviewOutcome[] => {
  const decisionsById = new Map(decisions.map((decision) => [decision.documentId, decision]));
  if (decisionsById.size !== decisions.length) {
    throw new AppError('Each document can only have one decision', 400);
  }

  const outcomes: ReviewOutcome[] = [];
  const missing: string[] = [];
  for (const { label, document } of checklist) {
    if (!document) continue;
    const decision = decisionsById.get(document._id);
    if (!decision) {
      missing.push(label);
      continue;
    }
    decisionsById.delete(document._id);
    outcomes.push({
      documentId: document._id,
      label,
      reviewStatus: decision.status,
      rejectionReason: decision.status === ReviewStatus.REJECTED ? (decision.rejectionReason ?? '').trim() : null,
    });
  }

  if (decisionsById.size > 0) {
    throw new AppError("Decisions must be for this candidate's documents", 400);
  }
  if (missing.length > 0) {
    throw new AppError(`Every document needs a decision. Missing: ${missing.join(', ')}`, 400);
  }
  return outcomes;
};

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

  /** The checklist as the Candidate sees it: Rejected documents first. */
  private async buildCandidateChecklist(profile: DocumentType<CandidateProfile>): Promise<DocumentChecklist> {
    const view = await this.buildChecklist(profile);
    return { ...view, checklist: rejectedFirst(view.checklist) };
  }

  async getMyChecklist(userId: string): Promise<DocumentChecklist> {
    const profile = await this.getApprovedProfile(userId);
    return this.buildCandidateChecklist(profile);
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

    const existing = await DocumentModel.findOne({
      candidate: profile._id,
      category: DocumentCategory.DOCUMENT,
      documentName,
    }).select('reviewStatus');
    if (existing?.reviewStatus === ReviewStatus.APPROVED) {
      throw new AppError('This document has been approved and cannot be replaced', 409);
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
    return this.buildCandidateChecklist(profile);
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
    const stillRejected = checklist
      .filter((item) => item.document?.reviewStatus === ReviewStatus.REJECTED)
      .map((item) => item.label);
    if (stillRejected.length > 0) {
      throw new AppError(`Please replace the rejected documents before submitting: ${stillRejected.join(', ')}`, 400);
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

    return this.buildCandidateChecklist(profile);
  }

  /** Candidates awaiting a Reviewer: Document Status Submitted, oldest Submission first. */
  async listSubmitted() {
    return CandidateProfileModel.find({ documentStatus: DocumentStatus.SUBMITTED })
      .sort({ documentsSubmittedAt: 1 })
      .select('firstName middleName lastName email mobile appliedFor documentsSubmittedAt')
      .lean();
  }

  async getForReview(candidateId: string): Promise<DocumentReviewView> {
    const profile = isValidObjectId(candidateId) ? await CandidateProfileModel.findById(candidateId) : null;
    if (!profile) {
      throw new AppError('Candidate not found', 404);
    }

    const { visaType, documentStatus, checklist } = await this.buildChecklist(profile);
    return {
      visaType,
      visaTypeLabel: getVisaTypeLabel(visaType),
      documentStatus,
      // Array sort is stable, so catalogue order holds within each group
      checklist: [...checklist].sort((a, b) => reviewOrder(a) - reviewOrder(b)),
    };
  }

  /**
   * Document Review: records a decision for every applicable Candidate Document and moves the
   * Document Status to Approved (all approved) or Changes Required (any rejected).
   * Accepted only while Submitted; the first Reviewer to submit wins.
   */
  async reviewDocuments(candidateId: string, decisions: ReviewDecisionDto[]) {
    const profile = isValidObjectId(candidateId) ? await CandidateProfileModel.findById(candidateId) : null;
    if (!profile) {
      throw new AppError('Candidate not found', 404);
    }
    if (documentStatusOf(profile) !== DocumentStatus.SUBMITTED) {
      throw alreadyReviewed();
    }

    const { checklist } = await this.buildChecklist(profile);
    const outcomes = matchDecisionsToDocuments(checklist, decisions);
    const rejected = outcomes
      .filter((outcome) => outcome.reviewStatus === ReviewStatus.REJECTED)
      .map(({ label, rejectionReason }) => ({ label, rejectionReason: rejectionReason ?? '' }));
    const nextStatus = rejected.length > 0 ? DocumentStatus.CHANGES_REQUIRED : DocumentStatus.APPROVED;

    // Claim the review first, conditional on Submitted, so simultaneous Reviewers can't both apply
    const { modifiedCount } = await CandidateProfileModel.updateOne(
      { _id: profile._id, documentStatus: DocumentStatus.SUBMITTED },
      { $set: { documentStatus: nextStatus } }
    );
    if (modifiedCount === 0) {
      throw alreadyReviewed();
    }

    try {
      await DocumentModel.bulkWrite(
        outcomes.map(({ documentId, reviewStatus, rejectionReason }) => ({
          updateOne: {
            filter: { _id: documentId, candidate: profile._id },
            update: { $set: { reviewStatus, rejectionReason } },
          },
        }))
      );
    } catch (error) {
      // Release the claim so the Candidate stays reviewable rather than stuck half-reviewed
      await CandidateProfileModel.updateOne(
        { _id: profile._id, documentStatus: nextStatus },
        { $set: { documentStatus: DocumentStatus.SUBMITTED } }
      );
      throw error;
    }

    // The review is recorded; a failed email must not undo it
    try {
      if (rejected.length > 0) {
        await sendDocumentChangesRequiredEmail(profile.email, rejected);
      } else {
        await sendDocumentsApprovedEmail(profile.email);
      }
    } catch (error) {
      logger.error('Document review saved but the candidate email failed', error);
    }

    return {
      documentStatus: nextStatus,
      approvedCount: outcomes.length - rejected.length,
      rejectedCount: rejected.length,
    };
  }
}

export const candidateDocumentService = new CandidateDocumentService();
