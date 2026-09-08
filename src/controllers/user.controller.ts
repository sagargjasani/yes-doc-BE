import { Request, Response, NextFunction } from 'express';
import UserModel, { Role } from '../models/User.model';
import { userService } from '../services/user.service';

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await userService.getUsers(req.query);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;
    const currentUserId = req.user?._id?.toString() || '';
    const user = await userService.updateUserStatus(id, isActive, currentUserId);
    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const user = await userService.updateUser(id, req.body);
    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const resendInvitation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await userService.resendInvitation(id);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getConsultants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const consultants = await UserModel.find({ role: Role.CONSULTANT });
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
