import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { closePublicCache } from './services/publicCache.js';
import { backfillCommunityPujas } from './services/communityPujaMigration.js';

process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled promise rejection:', reason instanceof Error ? reason.message : reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Process] Uncaught exception:', error.message);
  process.exit(1);
});

async function startServer() {
  try {
    await connectDB();
    const migration = await backfillCommunityPujas();
    if (migration.linked || migration.skipped) {
      console.log(`[Migration] Community pandal backfill complete: ${migration.linked} linked, ${migration.skipped} skipped.`);
    }

    const server = app.listen(env.PORT, () => {
      console.log('====================================================');
      console.log(`🏮 PujoMap API Server running in ${env.NODE_ENV} mode`);
      console.log(`📡 URL: http://localhost:${env.PORT}`);
      console.log(`🌍 Client Origin: ${env.CLIENT_URL}`);
      console.log(`🛡️ Auth: HTTP-only secure cookies`);
      console.log(`⏱️ Crowd radius: ${env.CROWD_RADIUS_METERS}m | Freshness: ${env.CROWD_FRESHNESS_MINUTES}min`);
      console.log('====================================================');
    });

    let shuttingDown = false;
    const handleShutdown = async (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      const forceExit = setTimeout(() => process.exit(1), env.SHUTDOWN_TIMEOUT_MS);
      forceExit.unref();
      server.close(async () => {
        await closePublicCache();
        await disconnectDB();
        clearTimeout(forceExit);
        console.log('[Server] HTTP server and database connections closed.');
        process.exit(0);
      });
      server.closeIdleConnections?.();
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();
