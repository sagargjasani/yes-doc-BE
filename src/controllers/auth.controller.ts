import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.register(req.body, req.user);
    res.status(201).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.login(req.body);
    
    // Set session
    req.session.userId = user._id.toString();

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response, next: NextFunction) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid'); // Assuming default session cookie name
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  });
};

export const getMe = (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    status: 'success',
    data: { user: req.user },
  });
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.forgotPassword(req.body);
    res.status(200).json({
      status: 'success',
      message: 'If a user with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.resetPassword(req.body);
    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const user = await authService.updateProfile(userId, req.body);
    res.status(200).json({
      status: 'success',
      data: { user },
      message: 'Profile updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const result = await authService.changePassword(userId, req.body);
    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
