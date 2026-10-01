import { Request, Response, NextFunction } from 'express';
import { candidateDocumentService } from '../services/candidateDocument.service';
import { SetVisaTypeDto } from '../validation/candidateDocument.dto';
import logger from '../utils/logger';

export const getMyDocumentChecklist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const checklist = await candidateDocumentService.getMyChecklist(req.user!._id.toString());

    res.status(200).json({
      status: 'success',
      data: checklist,
    });
  } catch (error) {
    logger.error('Error in getMyDocumentChecklist controller', error);
    next(error);
  }
};

export const submitMyDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const checklist = await candidateDocumentService.submitMyDocuments(req.user!._id.toString());

    res.status(200).json({
      status: 'success',
      message: 'Documents submitted for review',
      data: checklist,
    });
  } catch (error) {
    logger.error('Error in submitMyDocuments controller', error);
    next(error);
  }
};

export const listSubmittedCandidates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const candidates = await candidateDocumentService.listSubmitted();

    res.status(200).json({
      status: 'success',
      data: candidates,
    });
  } catch (error) {
    logger.error('Error in listSubmittedCandidates controller', error);
    next(error);
  }
};

export const getCandidateDocumentsForReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const view = await candidateDocumentService.getForReview(req.params.candidateId as string);

    res.status(200).json({
      status: 'success',
      data: view,
    });
  } catch (error) {
    logger.error('Error in getCandidateDocumentsForReview controller', error);
    next(error);
  }
};

export const setMyVisaType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visaType } = req.body as SetVisaTypeDto;
    const checklist = await candidateDocumentService.setMyVisaType(req.user!._id.toString(), visaType);

    res.status(200).json({
      status: 'success',
      message: 'Visa type updated successfully',
      data: checklist,
    });
  } catch (error) {
    logger.error('Error in setMyVisaType controller', error);
    next(error);
  }
};
