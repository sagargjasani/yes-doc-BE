import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { env } from './config/env';
import logger from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import { AppError } from './utils/AppError';
import authRoutes from './routes/auth.routes';
import commonAttributesRoutes from './routes/commonAttributes.routes';
import userRoutes from './routes/user.routes';
import candidateRoutes from './routes/candidate.routes';
import documentRoutes from './routes/document.routes';
import referenceFormRoutes from './routes/referenceForm.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({ origin: true, credentials: true })); // Adjust origin in production

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes',
  skip: () => env.NODE_ENV === 'test',
});
app.use('/api', limiter);

// Request Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
const morganFormat = env.NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  })
);

// Session Middleware with MongoDB
export const sessionStore = MongoStore.create({ mongoUrl: env.MONGO_URI });

export const sessionMiddleware = session({
  store: sessionStore,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
});
app.use(sessionMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/common-attributes', commonAttributesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reference-forms', referenceFormRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', message: 'API is running' });
});

// Unknown Routes Handler
app.use((req: Request, res: Response, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(errorHandler);

export default app;
