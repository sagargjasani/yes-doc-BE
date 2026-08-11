import { User } from '../models/User.model';
import { Document } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      user?: Document & User & { _id: any };
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}
