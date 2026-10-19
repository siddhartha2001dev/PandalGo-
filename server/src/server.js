import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(env.PORT, () => {
      console.log('====================================================');
      console.log(`🏮 PujoMap API Server running in ${env.NODE_ENV} mode`);
      console.log(`📡 URL: http://localhost:${env.PORT}`);
      console.log(`🌍 Client Origin: ${env.CLIENT_URL}`);
      console.log(`🛡️ Auth: HTTP-only secure cookies`);
      console.log(`⏱️ Crowd radius: ${env.CROWD_RADIUS_METERS}m | Freshness: ${env.CROWD_FRESHNESS_MINUTES}min`);
      console.log('====================================================');
    });

    const handleShutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();
