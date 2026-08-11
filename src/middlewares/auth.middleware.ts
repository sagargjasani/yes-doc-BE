import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import UserModel, { Role } from '../models/User.model';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session || !req.session.userId) {
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    const currentUser = await UserModel.findById(req.session.userId);
    if (!currentUser) {
      return next(new AppError('The user belonging to this session no longer exists.', 401));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
