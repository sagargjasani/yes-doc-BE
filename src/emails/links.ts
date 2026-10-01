import { env } from '../config/env';

/** Absolute link into the web app, for buttons in emails. */
export const appUrl = (path: string) => `${env.FRONTEND_URL.replace(/\/$/, '')}${path}`;
