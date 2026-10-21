import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

let transport: Promise<Transporter> | null = null;

const useMicrosoftOAuth = () => Boolean(env.SMTP_OAUTH_TENANT_ID && env.SMTP_OAUTH_CLIENT_ID && env.SMTP_OAUTH_CLIENT_SECRET);

/** App-only access token for Exchange Online SMTP (client credentials grant). */
const fetchMicrosoftToken = async (): Promise<{ accessToken: string; expires: number }> => {
  const response = await fetch(`https://login.microsoftonline.com/${env.SMTP_OAUTH_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.SMTP_OAUTH_CLIENT_ID,
      client_secret: env.SMTP_OAUTH_CLIENT_SECRET,
      scope: 'https://outlook.office365.com/.default',
    }),
  });
  const body = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(`Microsoft token request failed: ${body.error_description ?? response.status}`);
  }
  return { accessToken: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 };
};

const smtpAuth = () => {
  if (!env.SMTP_USER) return undefined;
  if (!useMicrosoftOAuth()) return { user: env.SMTP_USER, pass: env.SMTP_PASS };
  return {
    type: 'OAuth2' as const,
    user: env.SMTP_USER,
    provisionCallback: (_user: string, _renew: boolean, callback: (err: Error | null, accessToken: string, expires: number) => void) => {
      fetchMicrosoftToken().then(
        ({ accessToken, expires }) => callback(null, accessToken, expires),
        (error: Error) => callback(error, '', 0)
      );
    },
  };
};

const createTransport = async (): Promise<Transporter> => {
  if (env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      requireTLS: !env.SMTP_SECURE, // port 587: refuse to send credentials unless STARTTLS succeeds
      auth: smtpAuth(),
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
