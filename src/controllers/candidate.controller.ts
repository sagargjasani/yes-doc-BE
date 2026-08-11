import { Request, Response, NextFunction } from 'express';
import { candidateService } from '../services/candidate.service';
import { AddCandidateDto } from '../validation/candidate.dto';
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
