import { DocumentType } from '@typegoose/typegoose';
import CandidateProfileModel, { CandidateProfile, DocumentStatus, VisaType } from '../models/CandidateProfile.model';
import DocumentModel, { DocumentCategory, ReviewStatus } from '../models/Document.model';
import { getApplicableRequiredDocuments, visaTypeOptions } from '../constants/allDocumentsList';
import { AppError } from '../utils/AppError';

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
    const { visaType, documentStatus } = profile;
    const requiredDocuments = getApplicableRequiredDocuments(visaType);

    const documents = await DocumentModel.find({
      candidate: profile._id,
      category: DocumentCategory.DOCUMENT,
      documentName: { $in: requiredDocuments.map((doc) => doc.key) },
    });
    const documentsByKey = new Map(documents.map((doc) => [doc.documentName, doc]));

    return {
      visaType: visaType ?? null,
      documentStatus: documentStatus ?? DocumentStatus.NOT_SUBMITTED,
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

  async setMyVisaType(userId: string, visaType: VisaType): Promise<DocumentChecklist> {
    const profile = await this.getApprovedProfile(userId);
    // Targeted update: don't re-validate unrelated (possibly legacy) profile fields
    await CandidateProfileModel.updateOne({ _id: profile._id }, { $set: { visaType } });
    profile.visaType = visaType;
    return this.buildChecklist(profile);
  }
}

export const candidateDocumentService = new CandidateDocumentService();
