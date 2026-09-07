import { Request, Response, NextFunction } from 'express';
import * as referenceFormService from '../services/referenceForm.service';

export const sendReferenceRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { candidateId, refereeIndex } = req.body;
    const result = await referenceFormService.sendReferenceRequest(String(candidateId), Number(refereeIndex));
    res.status(200).json({
      status: 'success',
      message: `Reference request email sent to referee ${refereeIndex}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getCandidateReferencesStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const candidateId = String(req.params.candidateId);
    const result = await referenceFormService.getCandidateReferencesStatus(candidateId);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicReferenceForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = String(req.params.token);
    const result = await referenceFormService.getPublicReferenceForm(token);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicPresignedUploadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = String(req.params.token);
    const result = await referenceFormService.getPublicPresignedUploadUrl(token, req.body);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmPublicUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = String(req.params.token);
    const result = await referenceFormService.confirmPublicUpload(token, req.body);
    res.status(201).json({
      status: 'success',
      data: { document: result },
    });
  } catch (error) {
    next(error);
  }
};

export const submitPublicReferenceForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = String(req.params.token);
    const payload = req.body.formData || req.body || {};
    const result = await referenceFormService.submitPublicReferenceForm(token, payload);
    res.status(200).json({
      status: 'success',
      message: 'Reference form submitted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSubmittedReferenceForms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await referenceFormService.getSubmittedReferenceForms();
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const approveReferenceForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const result = await referenceFormService.approveReferenceForm(id);
    res.status(200).json({
      status: 'success',
      message: 'Reference form approved',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectReferenceForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { reason } = req.body;
    const result = await referenceFormService.rejectReferenceForm(id, String(reason || ''));
    res.status(200).json({
      status: 'success',
      message: 'Reference form rejected and new request link sent to referee',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
