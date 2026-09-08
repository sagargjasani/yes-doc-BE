import http from 'http';
import mongoose from 'mongoose';
import app, { sessionMiddleware } from './app';
import { env } from './config/env';
import logger from './utils/logger';
import { initSocket } from './services/socket.service';

// Handling Uncaught Exceptions globally
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

let server: http.Server;

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info('MongoDB Connected...');
  } catch (err) {
    logger.error('Error connecting to MongoDB', err);
    process.exit(1);
  }
};

const startServer = async () => {
  await connectDB();

  server = http.createServer(app);

  // Initialize Socket.IO
  initSocket(server, sessionMiddleware);

  server.listen(env.PORT, () => {
    logger.info(`App running on port ${env.PORT} in ${env.NODE_ENV} mode with Socket.IO enabled...`);
  });
};

startServer();

// Handling Unhandled Rejections globally
process.on('unhandledRejection', (err: any) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  if (server) {
    server.close(async () => {
      logger.info('💥 Process terminated!');
      await mongoose.connection.close();
    });
  }
});
