import { Request, Response, NextFunction } from 'express';
import UserModel, { Role } from '../models/User.model';

export const getConsultants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const consultants = await UserModel.find({ role: Role.CONSULTANT })
    const consultantsMap = consultants.map((consultant) => ({
      value: consultant._id.toString(),
      label: `${consultant.firstName} ${consultant.lastName}`,
    }));
    res.status(200).json({
      status: 'success',
      data: { consultants: consultantsMap },
    });
  } catch (error) {
    next(error);
  }
};
