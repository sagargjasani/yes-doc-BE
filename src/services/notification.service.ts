import mongoose from 'mongoose';
import NotificationModel, {
  NotificationAction,
  NotificationType,
} from '../models/Notification.model';
import UserModel, { Role } from '../models/User.model';
import { getIO } from './socket.service';
import logger from '../utils/logger';

export interface SendNotificationOptions {
  title: string;
  message: string;
  type?: NotificationType;
  action?: NotificationAction;
  persist?: boolean; // Default is true
}

export interface NotificationPayload {
  id?: string;
  title: string;
  message: string;
  type: NotificationType;
  action?: NotificationAction;
  isRead: boolean;
  createdAt: Date;
  persist: boolean;
}

export class NotificationService {
  /**
   * Send notification to a specific user by ID
   */
  public async notifyUser(userId: string, options: SendNotificationOptions) {
    const persist = options.persist !== false;
    let savedNotificationId: string | undefined;
    const createdAt = new Date();

    if (persist) {
      try {
        const doc = await NotificationModel.create({
          user: new mongoose.Types.ObjectId(userId),
          title: options.title,
          message: options.message,
          type: options.type || 'info',
          action: options.action,
          isRead: false,
        });
        savedNotificationId = doc._id.toString();
      } catch (error) {
        logger.error(`Failed to persist notification for user ${userId}:`, error);
      }
    }

    const payload: NotificationPayload = {
      id: savedNotificationId,
      title: options.title,
      message: options.message,
      type: options.type || 'info',
      action: options.action,
      isRead: false,
      createdAt,
      persist,
    };

    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('notification', payload);
    } catch (error) {
      logger.warn(`Could not emit socket notification to user:${userId}:`, error);
    }

    return payload;
  }

  /**
   * Send notification to multiple users by IDs
   */
  public async notifyUsers(userIds: string[], options: SendNotificationOptions) {
    const persist = options.persist !== false;
    const createdAt = new Date();
    const type = options.type || 'info';

    if (persist && userIds.length > 0) {
      try {
        const docs = userIds.map((userId) => ({
          user: new mongoose.Types.ObjectId(userId),
          title: options.title,
          message: options.message,
          type,
          action: options.action,
          isRead: false,
        }));
        await NotificationModel.insertMany(docs);
      } catch (error) {
        logger.error('Failed to batch persist notifications:', error);
      }
    }

    const payload: NotificationPayload = {
      title: options.title,
      message: options.message,
      type,
      action: options.action,
      isRead: false,
      createdAt,
      persist,
    };

    try {
      const io = getIO();
      userIds.forEach((userId) => {
        io.to(`user:${userId}`).emit('notification', payload);
      });
    } catch (error) {
      logger.warn('Could not emit socket notification to users:', error);
    }

    return payload;
  }

  /**
   * Send notification to one or multiple roles (e.g. 'admin', 'compliance')
   */
  public async notifyRole(roles: Role | Role[], options: SendNotificationOptions) {
    const roleList = Array.isArray(roles) ? roles : [roles];
    const persist = options.persist !== false;
    const createdAt = new Date();
    const type = options.type || 'info';

    if (persist) {
      try {
        const users = await UserModel.find({ role: { $in: roleList }, isActive: true }, '_id');
        if (users.length > 0) {
          const docs = users.map((u) => ({
            user: u._id,
            title: options.title,
            message: options.message,
            type,
            action: options.action,
            isRead: false,
          }));
          await NotificationModel.insertMany(docs);
        }
      } catch (error) {
        logger.error(`Failed to persist notifications for roles ${roleList.join(',')}:`, error);
      }
    }

    const payload: NotificationPayload = {
      title: options.title,
      message: options.message,
      type,
      action: options.action,
      isRead: false,
      createdAt,
      persist,
    };

    try {
      const io = getIO();
      roleList.forEach((r) => {
        io.to(`role:${r}`).emit('notification', payload);
      });
    } catch (error) {
      logger.warn(`Could not emit socket notification to roles ${roleList.join(',')}:`, error);
    }

    return payload;
  }

  /**
   * Broadcast notification to all connected clients
   */
  public async notifyAll(options: SendNotificationOptions) {
    const persist = options.persist !== false;
    const createdAt = new Date();
    const type = options.type || 'info';

    if (persist) {
      try {
        const users = await UserModel.find({ isActive: true }, '_id');
        if (users.length > 0) {
          const docs = users.map((u) => ({
            user: u._id,
            title: options.title,
            message: options.message,
            type,
            action: options.action,
            isRead: false,
          }));
          await NotificationModel.insertMany(docs);
        }
      } catch (error) {
        logger.error('Failed to broadcast persistent notifications to all users:', error);
      }
    }

    const payload: NotificationPayload = {
      title: options.title,
      message: options.message,
      type,
      action: options.action,
      isRead: false,
      createdAt,
      persist,
    };

    try {
      const io = getIO();
      io.emit('notification', payload);
    } catch (error) {
      logger.warn('Could not emit socket broadcast notification:', error);
    }

    return payload;
  }

  /**
   * Get user's notifications with pagination
   */
  public async getUserNotifications(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const query: Record<string, any> = { user: new mongoose.Types.ObjectId(userId) };
    if (unreadOnly) {
      query.isRead = false;
    }

    const skip = (page - 1) * limit;

    const [items, total, unreadCount] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments(query),
      NotificationModel.countDocuments({ user: new mongoose.Types.ObjectId(userId), isRead: false }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  /**
   * Get unread count for a user
   */
  public async getUnreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({
      user: new mongoose.Types.ObjectId(userId),
      isRead: false,
    });
  }

  /**
   * Mark a single notification as read
   */
  public async markAsRead(userId: string, notificationId: string) {
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(notificationId), user: new mongoose.Types.ObjectId(userId) },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
    return notification;
  }

  /**
   * Mark all notifications of a user as read
   */
  public async markAllAsRead(userId: string) {
    const result = await NotificationModel.updateMany(
      { user: new mongoose.Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return result;
  }

  /**
   * Delete a notification
   */
  public async deleteNotification(userId: string, notificationId: string) {
    return NotificationModel.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(notificationId),
      user: new mongoose.Types.ObjectId(userId),
    });
  }

  /**
   * Clear all notifications of a user
   */
  public async clearAll(userId: string) {
    return NotificationModel.deleteMany({
      user: new mongoose.Types.ObjectId(userId),
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
