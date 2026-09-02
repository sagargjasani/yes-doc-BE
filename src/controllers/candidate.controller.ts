import { Request, Response, NextFunction } from 'express';
import { candidateService } from '../services/candidate.service';
import { AddCandidateDto, RequestChangesDto } from '../validation/candidate.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

export const addCandidate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = plainToInstance(AddCandidateDto, req.body);
    const errors = await validate(dto);
    
    if (errors.length > 0) {
      const messages = errors.map((err) => Object.values(err.constraints || {})).flat();
      throw new AppError(`Validation failed: ${messages.join(', ')}`, 400);
    }

    const newCandidate = await candidateService.addCandidate(dto);

    res.status(201).json({
      status: 'success',
      data: newCandidate,
    });
  } catch (error) {
    logger.error('Error in addCandidate controller', error);
    next(error);
  }
};

export const sendRegistrationLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      throw new AppError('User ID is required', 400);
    }

    await candidateService.sendRegistrationLink(userId);

    res.status(200).json({
      status: 'success',
      message: 'Registration link sent successfully',
    });
  } catch (error) {
    logger.error('Error in sendRegistrationLink controller', error);
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const profile = await candidateService.getMe(userId);
    res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (error) {
    logger.error('Error in getMe controller', error);
    next(error);
  }
};

export const submitApplicationForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    const profile = await candidateService.submitApplicationForm(userId, req.body);
    res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (error) {
    logger.error('Error in submitApplicationForm controller', error);
    next(error);
  }
};

export const getSubmittedApplicationForms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forms = await candidateService.getSubmittedApplicationForms();
    res.status(200).json({
      status: 'success',
      data: forms,
    });
  } catch (error) {
    logger.error('Error in getSubmittedApplicationForms controller', error);
    next(error);
  }
};

export const getApplicationFormById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const form = await candidateService.getApplicationFormById(id);
    res.status(200).json({
      status: 'success',
      data: form,
    });
  } catch (error) {
    logger.error('Error in getApplicationFormById controller', error);
    next(error);
  }
};

export const approveApplicationForm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const form = await candidateService.approveApplicationForm(id);
    res.status(200).json({
      status: 'success',
      data: form,
      message: 'Application form approved successfully'
    });
  } catch (error) {
    logger.error('Error in approveApplicationForm controller', error);
    next(error);
  }
};

export const requestApplicationFormChanges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const dto = plainToInstance(RequestChangesDto, req.body);
    const errors = await validate(dto);
    
    if (errors.length > 0) {
      const messages = errors.map((err) => Object.values(err.constraints || {})).flat();
      throw new AppError(`Validation failed: ${messages.join(', ')}`, 400);
    }

    const form = await candidateService.requestApplicationFormChanges(id, dto.reason);
    res.status(200).json({
      status: 'success',
      data: form,
      message: 'Changes requested successfully'
    });
  } catch (error) {
    logger.error('Error in requestApplicationFormChanges controller', error);
    next(error);
  }
};

export const searchCandidates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string) || '';
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const result = await candidateService.searchCandidates(q, page, limit);

    res.status(200).json({
      status: 'success',
      data: result.candidates,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error in searchCandidates controller', error);
    next(error);
  }
};

export const getCandidateById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const candidate = await candidateService.getCandidateById(id);
    res.status(200).json({
      status: 'success',
      data: candidate,
    });
  } catch (error) {
    logger.error('Error in getCandidateById controller', error);
    next(error);
  }
};

export const updateCandidateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const updatedCandidate = await candidateService.updateCandidateProfile(id, req.body);
    res.status(200).json({
      status: 'success',
      data: updatedCandidate,
      message: 'Candidate profile updated successfully',
    });
  } catch (error) {
    logger.error('Error in updateCandidateProfile controller', error);
    next(error);
  }
};

