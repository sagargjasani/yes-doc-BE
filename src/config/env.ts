import { cleanEnv, str, port, num, bool } from 'envalid';
import dotenv from 'dotenv';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  PORT: port({ default: 5000 }),
  MONGO_URI: str({ default: 'mongodb://localhost:27017/enterprise-backend' }),
  SESSION_SECRET: str({ default: 'supersecret_change_me_in_production' }),
  FRONTEND_URL: str({ devDefault: 'http://localhost:5173' }),

  // Outbound email. With no SMTP_HOST outside production, mail goes to an Ethereal test inbox.
  SMTP_HOST: str({ devDefault: '' }),
  SMTP_PORT: port({ default: 587 }),
  SMTP_SECURE: bool({ default: false }),
  SMTP_USER: str({ devDefault: '' }),
  SMTP_PASS: str({ devDefault: '' }),
  EMAIL_FROM: str({ default: '"Yesdoc Healthcare" <no-reply@yesdochealthcare.co.uk>' }),
  EMAIL_REPLY_TO: str({ default: 'compliance@yesdochealthcare.co.uk' }),
  // Public base URL of the email artwork (this server's /email-assets, or a CDN in production).
  EMAIL_ASSET_BASE_URL: str({ devDefault: `http://localhost:${process.env.PORT ?? 5000}/email-assets` }),
});
