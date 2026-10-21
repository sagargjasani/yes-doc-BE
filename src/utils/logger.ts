import winston from 'winston';
import { env } from '../config/env';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const isDevelopment = env.NODE_ENV === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Errors don't survive JSON.stringify, so keep the fields that explain them (SMTP errors carry code and response).
const errorReplacer = (_key: string, value: unknown) =>
  value instanceof Error ? { ...value, name: value.name, message: value.message } : value;

/** Extra fields passed with a message, e.g. logger.error('Send failed', { to, error }). */
const meta = ({ timestamp, level, message, ...rest }: winston.Logform.TransformableInfo) =>
  Object.keys(rest).length ? ` ${JSON.stringify(rest, errorReplacer)}` : '';

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${meta(info)}`,
  ),
);

const transports = [
  new winston.transports.Console(),
];

const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

export default logger;
