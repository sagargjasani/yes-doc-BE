import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generatePresignedPostUrl, generatePresignedGetUrl, getCandidateS3Key, deleteS3File } from '../services/s3.service';
import DocumentModel from '../models/Document.model';
import CandidateProfileModel from '../models/CandidateProfile.model';
import { AppError } from '../utils/AppError';

export const getPresignedUploadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename, contentType, category, size, documentName, candidateId, documentId } = req.body;

    if (!filename || !contentType || !category || !size || !documentName) {
      return next(new AppError('Please provide filename, contentType, category, size, and documentName', 400));
    }

    let candidateProfile;
    if (candidateId) {
      candidateProfile = await CandidateProfileModel.findById(candidateId);
    } else if (documentId) {
      const existingDoc = await DocumentModel.findById(documentId);
      if (existingDoc) {
        candidateProfile = await CandidateProfileModel.findById(existingDoc.candidate);
      }
    } else {
      candidateProfile = await CandidateProfileModel.findOne({ user: req.user?._id });
    }

    if (!candidateProfile) {
      return next(new AppError('Candidate profile not found', 404));
    }

    // Default sizes based on implementation plan: 5MB for compressed images, 10MB for others
    let maxSize = 10 * 1024 * 1024; // 10MB
    if (contentType.startsWith('image/')) {
      maxSize = 5 * 1024 * 1024; // 5MB
    }

    if (size > maxSize) {
      return next(new AppError(`File size exceeds limit of ${maxSize / (1024 * 1024)}MB`, 400));
    }

    const extension = filename.split('.').pop();
    const s3Key = getCandidateS3Key(candidateProfile._id.toString(), category, documentName, extension);

    const { url, fields } = await generatePresignedPostUrl(s3Key, contentType, maxSize);

    res.status(200).json({
      status: 'success',
      data: {
        url,
        fields,
        s3Key,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const confirmUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { s3Key, originalName, mimeType, category, size, documentName, candidateId, documentId } = req.body;

    let candidateProfile;
    if (candidateId) {
      candidateProfile = await CandidateProfileModel.findById(candidateId);
    } else if (documentId) {
      const existingDoc = await DocumentModel.findById(documentId);
      if (existingDoc) {
        candidateProfile = await CandidateProfileModel.findById(existingDoc.candidate);
      }
    } else {
      candidateProfile = await CandidateProfileModel.findOne({ user: req.user?._id });
    }

    if (!candidateProfile) {
      return next(new AppError('Candidate profile not found', 404));
    }

    let document;
    if (documentId) {
      const existingDoc = await DocumentModel.findById(documentId);
      if (existingDoc && existingDoc.s3Key && existingDoc.s3Key !== s3Key) {
        // Delete previous S3 file if the s3Key changed
        await deleteS3File(existingDoc.s3Key);
      }

      document = await DocumentModel.findByIdAndUpdate(
        documentId,
        {
          candidate: candidateProfile._id,
          s3Key,
          originalName,
          mimeType,
          category,
          size,
          documentName,
        },
        { new: true }
      );
    }

    if (!document) {
      // Find existing by candidate, category, and documentName
      const existingDoc = await DocumentModel.findOne({
        candidate: candidateProfile._id,
        category,
        documentName,
      });

      if (existingDoc && existingDoc.s3Key && existingDoc.s3Key !== s3Key) {
        await deleteS3File(existingDoc.s3Key);
      }

      document = await DocumentModel.findOneAndUpdate(
        { candidate: candidateProfile._id, category, documentName },
        {
          s3Key,
          originalName,
          mimeType,
          category,
          size,
          documentName,
        },
        { new: true, upsert: true }
      );
    }

    res.status(201).json({
      status: 'success',
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const document = await DocumentModel.findById(id);
    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Optional: ensure the user has access to this document (either they own it or they are admin)
    // For now, if they are the candidate, ensure they own it.
    if (req.user?.role === 'candidate') {
      const candidateProfile = await CandidateProfileModel.findOne({ user: req.user._id });
      if (document.candidate.toString() !== candidateProfile?._id.toString()) {
        return next(new AppError('Not authorized to access this document', 403));
      }
    }

    const downloadUrl = await generatePresignedGetUrl(document.s3Key);

    res.status(200).json({
      status: 'success',
      data: { url: downloadUrl },
    });
  } catch (error) {
    next(error);
  }
};

export const getCandidateDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { candidateId } = req.params;

    const documents = await DocumentModel.find({ candidate: candidateId }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};
