import { createApp } from './app.js';
import { config } from './config/env.js';
import { logger } from './lib/logger.js';
import { initDb, closeDb } from './lib/db.js';

async function main() {
  await initDb();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`🚀 stripe-payments-service ruleaza pe portul ${config.port} (${config.env})`);
    logger.info(`   Aplicatii configurate: ${Object.keys(config.auth.appToKey).join(', ')}`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} primit, inchid serviciul...`);
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
    // force-exit safety net
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Pornirea serviciului a esuat.');
  process.exit(1);
});
