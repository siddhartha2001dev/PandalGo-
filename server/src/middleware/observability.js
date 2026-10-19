import crypto from 'crypto';
import { env } from '../config/env.js';

export function requestObservability(req, res, next) {
  const requestId = req.get('x-request-id') || crypto.randomUUID();
  const startedAt = process.hrtime.bigint();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ success: false, message: 'Request timed out. Please try again.' });
    }
  }, env.REQUEST_TIMEOUT_MS);

  res.once('finish', () => {
    clearTimeout(timeout);
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.info(JSON.stringify({
      requestId,
      method: req.method,
      route: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    }));
  });

  next();
}
