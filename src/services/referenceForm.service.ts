import crypto from 'crypto';
import path from 'path';
import fse from 'fs-extra';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import ReferenceFormModel, { ReferenceFormStatus } from '../models/ReferenceForm.model';
import CandidateProfileModel from '../models/CandidateProfile.model';
import DocumentModel, { DocumentCategory } from '../models/Document.model';
import { uploadS3File, downloadS3File, generatePresignedGetUrl, generatePresignedPostUrl, getCandidateS3Key } from './s3.service';
import { formatDates } from '../utils/formatters';
import { generateDocx } from '../utils/docx';
import { AppError } from '../utils/AppError';
import { appUrl } from '../emails/links';
import { sendEmail } from '../emails/send';
import { REFERENCE_FORM_LINK_DAYS } from '../constants/linkExpiry';
import logger from '../utils/logger';

dayjs.extend(customParseFormat);

const parseToDate = (val: any): Date | undefined => {
  if (!val) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    const d = dayjs(trimmed, ['DD/MM/YYYY', 'YYYY-MM-DD', 'YYYY-MM-DDTHH:mm:ss.SSSZ']);
    if (d.isValid()) return d.toDate();
    const fallback = dayjs(trimmed);
    if (fallback.isValid()) return fallback.toDate();
  }
  return undefined;
};

/**
 * Recalculates and updates CandidateProfile.referenceStatus based on reference forms
 */
export const updateCandidateReferenceStatus = async (candidateId: string) => {
  const forms = await ReferenceFormModel.find({ candidate: candidateId });
  if (!forms || forms.length === 0) {
    await CandidateProfileModel.findByIdAndUpdate(candidateId, { referenceStatus: 'NOT_SENT' });
    return 'NOT_SENT';
  }

  const statuses = forms.map((f) => f.status);

  let newStatus: ReferenceFormStatus = 'NOT_SENT';

  if (statuses.every((s) => s === 'APPROVED') && forms.length >= 2) {
    newStatus = 'APPROVED';
  } else if (statuses.some((s) => s === 'SUBMITTED' || s === 'APPROVED')) {
    newStatus = 'SUBMITTED';
  } else if (statuses.some((s) => s === 'SENT')) {
    newStatus = 'SENT';
  }

  await CandidateProfileModel.findByIdAndUpdate(candidateId, { referenceStatus: newStatus });
  return newStatus;
};

export const sendReferenceRequest = async (candidateId: string, refereeIndex: number) => {
  const candidate = await CandidateProfileModel.findById(candidateId);
  if (!candidate) {
    throw new AppError('Candidate not found', 404);
  }

  let refereeName = '';
  let refereeEmail = '';
  let refereeCompany = '';
  let refereeRelationship = '';
  let refereeMobile = '';

  if (refereeIndex === 1) {
    refereeName = candidate.ref1Name || '';
    refereeEmail = candidate.ref1Email || '';
    refereeCompany = candidate.ref1Company || '';
    refereeRelationship = candidate.ref1Relationship || '';
    refereeMobile = candidate.ref1Mobile || '';
  } else if (refereeIndex === 2) {
    refereeName = candidate.ref2Name || '';
    refereeEmail = candidate.ref2Email || '';
    refereeCompany = candidate.ref2Company || '';
    refereeRelationship = candidate.ref2Relationship || '';
    refereeMobile = candidate.ref2Mobile || '';
  } else {
    throw new AppError('Invalid referee index', 400);
  }

  if (!refereeEmail || !refereeName) {
    throw new AppError(`Referee ${refereeIndex} details (Name and Email) are incomplete on candidate profile`, 400);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenExpiresAt = dayjs().add(REFERENCE_FORM_LINK_DAYS, 'day').toDate();

  let refForm = await ReferenceFormModel.findOne({ candidate: candidate._id, refereeIndex });

  if (refForm) {
    refForm.refereeName = refereeName;
    refForm.refereeEmail = refereeEmail;
    refForm.refereeCompany = refereeCompany;
    refForm.refereeRelationship = refereeRelationship;
    refForm.refereeMobile = refereeMobile;
    refForm.token = token;
    refForm.tokenExpiresAt = tokenExpiresAt;
    refForm.status = 'SENT';
    refForm.sentAt = new Date();
    await refForm.save();
  } else {
    refForm = await ReferenceFormModel.create({
      candidate: candidate._id,
      refereeIndex,
      refereeName,
      refereeEmail,
      refereeCompany,
      refereeRelationship,
      refereeMobile,
      token,
      tokenExpiresAt,
      status: 'SENT',
      sentAt: new Date(),
    });
  }

  await updateCandidateReferenceStatus(candidate._id.toString());

  const candidateFullName = candidate.fullName || `${candidate.firstName} ${candidate.lastName}`;
  await sendEmail('referenceRequest', {
    to: refereeEmail,
    props: { refereeName, candidateName: candidateFullName, referenceUrl: appUrl(`/reference-form/${token}`) },
  });

  return refForm;
};

export const getCandidateReferencesStatus = async (candidateId: string) => {
  const candidate = await CandidateProfileModel.findById(candidateId);
  if (!candidate) {
    throw new AppError('Candidate not found', 404);
  }
  const forms = await ReferenceFormModel.find({ candidate: candidateId });
  return {
    candidateReferenceStatus: candidate.referenceStatus || 'NOT_SENT',
    ref1: forms.find((f) => f.refereeIndex === 1) || null,
    ref2: forms.find((f) => f.refereeIndex === 2) || null,
  };
};

export const getPublicPresignedUploadUrl = async (token: string, payload: any) => {
  const { filename, contentType, category, size, documentName } = payload;
  const refForm = await ReferenceFormModel.findOne({ token });
  if (!refForm) {
    throw new AppError('Invalid or expired reference form link', 404);
  }

  if (dayjs().isAfter(dayjs(refForm.tokenExpiresAt))) {
    throw new AppError('This reference link has expired after 7 days.', 400);
  }

  let maxSize = 10 * 1024 * 1024;
  if (contentType && contentType.startsWith('image/')) {
    maxSize = 5 * 1024 * 1024;
  }

  if (size > maxSize) {
    throw new AppError(`File size exceeds limit of ${maxSize / (1024 * 1024)}MB`, 400);
  }

  const extension = filename ? filename.split('.').pop() : 'png';
  const s3Key = getCandidateS3Key(refForm.candidate.toString(), category || DocumentCategory.FORM, documentName, extension);
  const { url, fields } = await generatePresignedPostUrl(s3Key, contentType, maxSize);

  return { url, fields, s3Key };
};

export const confirmPublicUpload = async (token: string, payload: any) => {
  const { s3Key, originalName, mimeType, category, size, documentName } = payload;
  const refForm = await ReferenceFormModel.findOne({ token });
  if (!refForm) {
    throw new AppError('Invalid or expired reference form link', 404);
  }

  const document = await DocumentModel.findOneAndUpdate(
    { candidate: refForm.candidate, category: category || DocumentCategory.FORM, documentName },
    {
      candidate: refForm.candidate,
      s3Key,
      originalName,
      mimeType,
      category: category || DocumentCategory.FORM,
      size,
    },
    { new: true, upsert: true }
  );

  refForm.signatureS3Key = s3Key;
  await refForm.save();

  return document;
};

export const getPublicReferenceForm = async (token: string) => {
  const refForm = await ReferenceFormModel.findOne({ token }).populate<{ candidate: any }>('candidate', 'firstName lastName email');
  if (!refForm) {
    throw new AppError('Invalid or expired reference form link', 404);
  }

  if (dayjs().isAfter(dayjs(refForm.tokenExpiresAt))) {
    throw new AppError('This reference link has expired after 7 days. Please request a new link.', 400);
  }

  const candidate = refForm.candidate as any;
  const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}`.trim() : 'Candidate';

  let signatureUrl = null;
  if (refForm.signatureS3Key) {
    try {
      signatureUrl = await generatePresignedGetUrl(refForm.signatureS3Key);
    } catch (e) {
      logger.error('Error generating presigned signature URL', e);
    }
  }

  const refObj = refForm.toObject();

  return {
    ...refObj,
    token: refForm.token,
    candidateName,
    signature: signatureUrl,
    expiresAt: refForm.tokenExpiresAt,
  };
};

export const submitPublicReferenceForm = async (token: string, formData: Record<string, any>) => {
  const refForm = await ReferenceFormModel.findOne({ token }).populate<{ candidate: any }>('candidate', 'firstName lastName');
  if (!refForm) {
    throw new AppError('Invalid or expired reference form link', 404);
  }

  if (dayjs().isAfter(dayjs(refForm.tokenExpiresAt))) {
    throw new AppError('This reference link has expired after 7 days.', 400);
  }

  const candidate = refForm.candidate as any;
  const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}`.trim() : '';
  const candidateId = refForm.candidate._id.toString();

  // 2. Assign flat properties onto refForm
  const { signature, startDate, endDate, date, ...restData } = formData;
  Object.assign(refForm, restData);

  refForm.candidateName = candidateName;
  refForm.refereeName = refForm.refereeName;
  refForm.refereeEmail = refForm.refereeEmail;
  refForm.refereeContactNumber = refForm.refereeMobile || formData.refereeContactNumber || '';
  refForm.startDate = parseToDate(startDate);
  refForm.endDate = parseToDate(endDate);
  refForm.date = new Date();
  refForm.status = 'SUBMITTED';
  refForm.submittedAt = new Date();

  await refForm.save();

  await updateCandidateReferenceStatus(candidateId);

  return refForm;
};

export const getSubmittedReferenceForms = async () => {
  const forms = await ReferenceFormModel.find({
    status: 'SUBMITTED',
  })
    .populate<{ candidate: any }>({
      path: 'candidate',
      select: 'firstName lastName email mobile consultant referenceStatus',
      populate: {
        path: 'consultant',
        select: 'firstName lastName',
      },
    })
    .sort({ updatedAt: -1 });

  // Generate presigned signature URLs for reviewed forms
  const result = await Promise.all(
    forms.map(async (form) => {
      const obj = form.toObject();
      let signatureUrl = null;
      if (form.signatureS3Key) {
        try {
          signatureUrl = await generatePresignedGetUrl(form.signatureS3Key);
        } catch (e) {
          logger.error('Error generating signature presigned URL for review drawer', e);
        }
      }
      return {
        ...obj,
        signature: signatureUrl,
      };
    })
  );

  return result;
};

export const approveReferenceForm = async (formId: string) => {
  const refForm = await ReferenceFormModel.findById(formId).populate({
    path: 'candidate',
    select: 'firstName lastName email mobile',
  });
  if (!refForm) {
    throw new AppError('Reference form not found', 404);
  }

  const candidateId = ((refForm.candidate as any)?._id || refForm.candidate).toString();

  // Try generating populated docx for the reference form similar to candidate.service.ts
  try {
    const singatureKey = await DocumentModel.findOne({
      candidate: candidateId,
      documentName: `reference-${refForm.refereeIndex}-signature`
    });
    if (!singatureKey) {
      throw new AppError('Signature not found', 404);
    }

    const signatureBuffer = await downloadS3File(singatureKey.s3Key);
    const signPath = `./temps/${candidateId}/reference-${refForm.refereeIndex}-sign.png`;

    await fse.outputFile(signPath, signatureBuffer);

    const renderData = formatDates({
      ...refForm.toObject(),
      signature: signPath,
    });


    const docxBuffer = await generateDocx({
      templatePath: './src/assets/referenceForm/reference-form.docx',
      data: renderData,
    });

    fse.writeFile(`./temps/${candidateId}/reference-${refForm.refereeIndex}.docx`, docxBuffer);

    const uploadKey = getCandidateS3Key(
      candidateId,
      DocumentCategory.FORM,
      `Reference Form ${refForm.refereeIndex}`,
      'docx'
    );

    await uploadS3File(uploadKey, docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    await DocumentModel.findOneAndUpdate(
      { candidate: candidateId, category: DocumentCategory.FORM, documentName: `Reference Form ${refForm.refereeIndex}` },
      {
        candidate: candidateId,
        s3Key: uploadKey,
        originalName: `Reference Form ${refForm.refereeIndex}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        category: DocumentCategory.FORM,
        size: docxBuffer.length,
      },
      { new: true, upsert: true }
    );

    refForm.status = 'APPROVED';
    refForm.reviewedAt = new Date();
    await refForm.save();

    await updateCandidateReferenceStatus(candidateId);

    return refForm;

  } catch (err) {
    logger.error('Error generating approved reference form docx', err);
  }

};

export const rejectReferenceForm = async (formId: string, reason: string) => {
  const refForm = await ReferenceFormModel.findById(formId);
  if (!refForm) {
    throw new AppError('Reference form not found', 404);
  }

  if (!reason || reason.trim().length === 0) {
    throw new AppError('Rejection reason is required', 400);
  }

  const newToken = crypto.randomBytes(32).toString('hex');
  const newTokenExpiresAt = dayjs().add(REFERENCE_FORM_LINK_DAYS, 'day').toDate();

  refForm.status = 'SENT';
  refForm.rejectionReason = reason;
  refForm.token = newToken;
  refForm.tokenExpiresAt = newTokenExpiresAt;
  refForm.reviewedAt = new Date();
  await refForm.save();

  await updateCandidateReferenceStatus(refForm.candidate.toString());

  const candidate = await CandidateProfileModel.findById(refForm.candidate);
  const candidateName = candidate ? candidate.fullName || `${candidate.firstName} ${candidate.lastName}` : 'Candidate';

  await sendEmail('referenceResubmission', {
    to: refForm.refereeEmail,
    props: {
      refereeName: refForm.refereeName,
      candidateName,
      reason,
      referenceUrl: appUrl(`/reference-form/${newToken}`),
    },
  });

  return refForm;
};
