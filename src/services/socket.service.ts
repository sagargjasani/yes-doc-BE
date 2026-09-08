import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { RequestHandler } from 'express';
import logger from '../utils/logger';
import UserModel, { User } from '../models/User.model';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: User & { _id: any };
  };
}

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer, sessionMiddleware: RequestHandler): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Use the express session middleware for socket.io engine
  io.engine.use(sessionMiddleware);

  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const req = socket.request as any;
      const session = req.session;

      if (!session || !session.userId) {
        return next(new Error('Authentication error: No session found'));
      }

      const currentUser = await UserModel.findById(session.userId);
      if (!currentUser) {
        return next(new Error('Authentication error: User not found'));
      }

      if (currentUser.isActive === false) {
        return next(new Error('Authentication error: User is deactivated'));
      }

      socket.data.user = currentUser;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Internal server error during socket authentication'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    if (!user) return;

    const userId = user._id.toString();
    const userRoom = `user:${userId}`;
    const roleRoom = `role:${user.role}`;

    // Join user-specific room and role-specific room
    socket.join(userRoom);
    socket.join(roleRoom);

    logger.info(`⚡ Socket connected: ${socket.id} | User: ${userId} (${user.firstName} ${user.lastName}) | Role: ${user.role}`);

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO is not initialized! Call initSocket first.');
  }
  return io;
};
