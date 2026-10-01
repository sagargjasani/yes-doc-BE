import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

let transport: Promise<Transporter> | null = null;

const createTransport = async (): Promise<Transporter> => {
  if (env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }

  // Development without SMTP: a throwaway Ethereal inbox (preview URL is logged per send).
  const account = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  });
};

/** One transport for the process, created on first use. */
export const getTransport = (): Promise<Transporter> => {
  transport ??= createTransport().catch((error) => {
    transport = null; // let the next send retry instead of caching the failure
    throw error;
  });
  return transport;
};

/** Ethereal's web preview for a sent message, or false for real SMTP. */
export const previewUrl = (info: Parameters<typeof nodemailer.getTestMessageUrl>[0]) => nodemailer.getTestMessageUrl(info);
