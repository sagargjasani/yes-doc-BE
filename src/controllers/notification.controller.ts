import { Request, Response, NextFunction } from 'express';
import notificationService from '../services/notification.service';
import { AppError } from '../utils/AppError';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getUserNotifications(userId, page, limit, unreadOnly);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      status: 'success',
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const id = req.params.id as string;

    const notification = await notificationService.markAsRead(userId, id);
    if (!notification) {
      return next(new AppError('Notification not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    const id = req.params.id as string;

    const deleted = await notificationService.deleteNotification(userId, id);
    if (!deleted) {
      return next(new AppError('Notification not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const clearAllNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId!;
    await notificationService.clearAll(userId);

    res.status(200).json({
      status: 'success',
      message: 'All notifications cleared successfully',
    });
  } catch (error) {
    next(error);
  }
};
