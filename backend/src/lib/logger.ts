import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info'),
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  ...(env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : {}),
});
