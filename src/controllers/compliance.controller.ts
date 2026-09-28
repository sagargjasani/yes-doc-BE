import { Request, Response, NextFunction } from 'express';
import * as complianceService from '../services/compliance.service';
import logger from '../utils/logger';

export const generateComplianceForms = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidateId = String(req.params.id);
    const result = await complianceService.generateComplianceForms(candidateId);

    res.status(200).json({
      status: 'success',
      message: `${result.total} compliance form(s) generated successfully`,
      data: result,
    });
  } catch (error) {
    logger.error('Error in generateComplianceForms controller', error);
    next(error);
  }
};
