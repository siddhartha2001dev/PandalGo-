import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestObservability } from './middleware/observability.js';

import authRoutes from './routes/authRoutes.js';
import pujaRoutes from './routes/pujaRoutes.js';
import contributionRoutes from './routes/contributionRoutes.js';
import postRoutes from './routes/postRoutes.js';
import crowdRoutes from './routes/crowdRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import devBotRoutes from './routes/devBotRoutes.js';
import { isDatabaseConnected } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads');

const app = express();

app.use(requestObservability);

// Render terminates TLS at its proxy; trust only the first proxy hop so
// secure cookies and rate-limit client IPs behave correctly in production.
app.set('trust proxy', 1);

// Security headers with relaxation for loading images across localhost ports
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration supporting credentials (cookies)
const configuredOrigins = env.CLIENT_URL
  ? env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/+$/, ''))
  : [];

const localOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  let cleanOrigin = origin.replace(/\/+$/, '');
  try {
    cleanOrigin = new URL(origin).origin;
  } catch {
    // The Origin header is normally a URL; leave malformed values to fail closed.
  }
  return localOrigins.includes(cleanOrigin) ||
    configuredOrigins.includes(cleanOrigin) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(cleanOrigin);
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// CORS does not stop a browser from sending a credentialed cross-site form.
// Reject state-changing browser requests whose Origin is not an approved frontend.
app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin') || req.get('referer');
  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({ success: false, message: 'Request origin is not allowed.' });
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded image assets statically
app.use('/uploads', express.static(uploadsDir));

// Rate limiting on all API routes
app.use('/api', apiLimiter);

// API v1 routes mounting
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pujas', pujaRoutes);
app.use('/api/v1/contributions', contributionRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/crowd', crowdRoutes);
// Also support route aliases matching the prompt's /api/v1/pujas/:pujaId/crowd-reports
app.use('/api/v1/pujas', crowdRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/dev-bot', devBotRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const databaseConnected = isDatabaseConnected();
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'healthy' : 'degraded',
    database: databaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    service: 'PujoMap API',
    version: '1.0.0',
  });
});

// Liveness never depends on MongoDB; Render can use it to detect a running process.
app.get('/api/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness reflects whether this instance can serve database-backed traffic.
app.get('/api/ready', (req, res) => {
  const databaseConnected = isDatabaseConnected();
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ready' : 'not_ready',
    database: databaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
