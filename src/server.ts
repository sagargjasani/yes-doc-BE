import mongoose from 'mongoose';
import app from './app';
import { env } from './config/env';
import logger from './utils/logger';

// Handling Uncaught Exceptions globally
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

let server: any;

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

  server = app.listen(env.PORT, () => {
    logger.info(`App running on port ${env.PORT} in ${env.NODE_ENV} mode...`);
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
