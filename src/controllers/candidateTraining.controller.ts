import { Request, Response, NextFunction } from 'express';
import { candidateTrainingService } from '../services/candidateTraining.service';
import logger from '../utils/logger';

export const getCandidateTrainings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidateId = req.params.id as string;
    const trainings = await candidateTrainingService.getCandidateTrainings(candidateId);

    res.status(200).json({
      status: 'success',
      data: trainings,
    });
  } catch (error) {
    logger.error('Error in getCandidateTrainings controller', error);
    next(error);
  }
};

export const updateCandidateTrainings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidateId = req.params.id as string;
    const trainings = await candidateTrainingService.updateCandidateTrainings(
      candidateId,
      req.body
    );

    res.status(200).json({
      status: 'success',
      message: 'Candidate trainings updated successfully',
      data: trainings,
    });
  } catch (error) {
    logger.error('Error in updateCandidateTrainings controller', error);
    next(error);
  }
};
